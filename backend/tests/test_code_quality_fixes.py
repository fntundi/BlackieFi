"""
Test suite for BlackieFi 3.0 Code Quality Review Fixes
Tests: sessionStorage token handling, API endpoints, decomposed functions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://portfolio-analytics-33.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@blackiefi.com"
TEST_PASSWORD = "Demo123!"


class TestAuthFlow:
    """Test authentication flow with token handling"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_login_returns_token(self):
        """Test login returns access_token for sessionStorage"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        
    def test_logout_endpoint(self, auth_token):
        """Test logout endpoint works"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/auth/logout", headers=headers)
        assert response.status_code == 200
        assert "message" in response.json()


class TestDashboardUnified:
    """Test unified dashboard endpoint (decomposed helper functions)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_unified_dashboard_returns_valid_data(self, auth_token):
        """Test /api/dashboard/unified returns valid data structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/unified", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify key fields exist
        assert "total_balance" in data
        assert "total_debt" in data
        assert "total_investments" in data
        assert "monthly_income" in data
        assert "monthly_expenses" in data
        
        # Verify data types
        assert isinstance(data["total_balance"], (int, float))
        assert isinstance(data["total_debt"], (int, float))


class TestTransactionsSearch:
    """Test transactions search endpoint (decomposed _build_transaction_filter)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_search_transactions_returns_paginated_data(self, auth_token):
        """Test /api/transactions/search returns valid paginated data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/transactions/search", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify pagination structure
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert "summary" in data
        
        # Verify summary structure
        assert "total_income" in data["summary"]
        assert "total_expenses" in data["summary"]
        assert "net" in data["summary"]
        
    def test_search_with_filters(self, auth_token):
        """Test search with various filters"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/transactions/search",
            params={"transaction_type": "expense", "page_size": 10},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page_size"] == 10


class TestBillPaySchedules:
    """Test Bill Pay endpoints (BillPayPage extracted components)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_list_schedules(self, auth_token):
        """Test GET /api/billpay/schedules"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/billpay/schedules", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "schedules" in data
        
    def test_create_toggle_delete_schedule(self, auth_token):
        """Test full CRUD cycle for bill schedule"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create
        create_data = {
            "name": "TEST_Code_Quality_Bill",
            "amount": 99.99,
            "frequency": "monthly",
            "day_of_month": 15,
            "source_type": "expense",
            "enabled": True
        }
        response = requests.post(f"{BASE_URL}/api/billpay/schedules", json=create_data, headers=headers)
        assert response.status_code == 200
        schedule = response.json()
        schedule_id = schedule["id"]
        
        # Toggle
        response = requests.post(f"{BASE_URL}/api/billpay/schedules/{schedule_id}/toggle", headers=headers)
        assert response.status_code == 200
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/billpay/schedules/{schedule_id}", headers=headers)
        assert response.status_code == 200
        
    def test_billpay_history(self, auth_token):
        """Test GET /api/billpay/history"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/billpay/history", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "history" in data


class TestAuditLog:
    """Test Audit Log endpoints (AuditLogPage extracted components)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_audit_logs(self, auth_token):
        """Test GET /api/audit/ returns logs with pagination"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/audit/", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        
    def test_get_audit_actions(self, auth_token):
        """Test GET /api/audit/actions returns action types"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/audit/actions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data
        
    def test_get_audit_resource_types(self, auth_token):
        """Test GET /api/audit/resource-types returns resource types"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/audit/resource-types", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "resource_types" in data


class TestDebtPayoff:
    """Test Debt Payoff endpoint (decomposed _simulate_accelerated_payoff)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_payoff_estimate_avalanche(self, auth_token):
        """Test /api/debts/payoff-estimate with avalanche strategy"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/debts/payoff-estimate",
            json={"extra_monthly": 100, "strategy": "avalanche"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        # Should have debts array and totals
        assert "debts" in data or "total_interest" in data
        
    def test_payoff_estimate_snowball(self, auth_token):
        """Test /api/debts/payoff-estimate with snowball strategy"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/debts/payoff-estimate",
            json={"extra_monthly": 50, "strategy": "snowball"},
            headers=headers
        )
        assert response.status_code == 200


class TestBudgetVariance:
    """Test Budget Variance endpoint (decomposed _build_single_month_variance)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_budget_variance_report(self, auth_token):
        """Test /api/budgets/variance returns multi-month report"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/budgets/variance", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Response has "reports" array and "trend" object
        assert "reports" in data
        assert isinstance(data["reports"], list)
        assert "trend" in data


class TestRolesPermissions:
    """Test Roles and Permissions endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_list_roles(self, auth_token):
        """Test GET /api/roles/ returns roles list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/roles/", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have default roles
        role_names = [r["name"] for r in data]
        assert "admin" in role_names or len(data) > 0


class TestPDFExport:
    """Test PDF Export endpoints (uses tokenStorage)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_pdf_dashboard_export(self, auth_token):
        """Test GET /api/pdf/dashboard returns PDF"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/pdf/dashboard", headers=headers)
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        
    def test_pdf_transactions_export(self, auth_token):
        """Test GET /api/pdf/transactions returns PDF"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/pdf/transactions", headers=headers)
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")


class TestCrossEntity:
    """Test Cross-Entity endpoints (uses tokenStorage for entity switching)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_list_entities(self, auth_token):
        """Test GET /api/entities/ returns user's entities"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/entities/", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0  # Should have at least personal entity
        
    def test_cross_entity_summary(self, auth_token):
        """Test GET /api/multitenancy/cross-entity-summary"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/multitenancy/cross-entity-summary", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "entities" in data or "total_net_worth" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
