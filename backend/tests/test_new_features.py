"""
Test suite for BlackieFi 6 new features:
1. Portfolio Analytics (line, pie, bar charts)
2. Audit Log Viewer
3. Recurring Transaction Auto-generation
4. Multi-tenancy Cross-Entity Reporting
5. PDF Export with Charts
6. PWA Service Worker (frontend only)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://portfolio-analytics-33.preview.emergentagent.com').rstrip('/')

# Test credentials — loaded from env or test_credentials.md defaults
TEST_EMAIL = os.environ.get("TEST_EMAIL", "demo@blackiefi.com")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "Demo123!")


class TestAuth:
    """Authentication tests to get token for subsequent tests"""
    
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
    
    def test_login_success(self):
        """Test login with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL


class TestPortfolioAnalytics:
    """Test Portfolio Analytics endpoints - Feature 1"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_portfolio_summary(self, auth_headers):
        """Test GET /api/portfolio-analytics/summary"""
        response = requests.get(f"{BASE_URL}/api/portfolio-analytics/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Verify response structure
        assert "total_cash" in data
        assert "total_investments" in data
        assert "investment_gain" in data
        assert "investment_gain_pct" in data
        assert "total_debt" in data
        assert "net_worth" in data
        # Verify data types
        assert isinstance(data["total_cash"], (int, float))
        assert isinstance(data["net_worth"], (int, float))
    
    def test_portfolio_history(self, auth_headers):
        """Test GET /api/portfolio-analytics/history - for line chart"""
        response = requests.get(f"{BASE_URL}/api/portfolio-analytics/history?months=12", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert isinstance(data["history"], list)
        # Verify history structure if data exists
        if len(data["history"]) > 0:
            item = data["history"][0]
            assert "month" in item
            assert "net_worth" in item
            assert "investments" in item
            assert "cash_flow" in item
    
    def test_portfolio_allocation(self, auth_headers):
        """Test GET /api/portfolio-analytics/allocation - for pie chart"""
        response = requests.get(f"{BASE_URL}/api/portfolio-analytics/allocation", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "allocation" in data
        assert "total" in data
        assert isinstance(data["allocation"], list)
        # Verify allocation structure if data exists
        if len(data["allocation"]) > 0:
            item = data["allocation"][0]
            assert "name" in item
            assert "value" in item
            assert "percentage" in item
    
    def test_portfolio_monthly_performance(self, auth_headers):
        """Test GET /api/portfolio-analytics/monthly-performance - for bar chart"""
        response = requests.get(f"{BASE_URL}/api/portfolio-analytics/monthly-performance?months=6", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "performance" in data
        assert isinstance(data["performance"], list)
        # Verify performance structure if data exists
        if len(data["performance"]) > 0:
            item = data["performance"][0]
            assert "month" in item
            assert "income" in item
            assert "expenses" in item
            assert "net" in item


class TestAuditLog:
    """Test Audit Log endpoints - Feature 2"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_audit_logs(self, auth_headers):
        """Test GET /api/audit/ - list audit logs"""
        response = requests.get(f"{BASE_URL}/api/audit/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert isinstance(data["logs"], list)
    
    def test_get_audit_logs_with_filters(self, auth_headers):
        """Test GET /api/audit/ with filters"""
        response = requests.get(
            f"{BASE_URL}/api/audit/?limit=10&offset=0",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["limit"] == 10
        assert data["offset"] == 0
    
    def test_get_audit_actions(self, auth_headers):
        """Test GET /api/audit/actions - get unique actions for filtering"""
        response = requests.get(f"{BASE_URL}/api/audit/actions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "actions" in data
        assert isinstance(data["actions"], list)
    
    def test_get_audit_resource_types(self, auth_headers):
        """Test GET /api/audit/resource-types - get unique resource types"""
        response = requests.get(f"{BASE_URL}/api/audit/resource-types", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "resource_types" in data
        assert isinstance(data["resource_types"], list)


class TestRecurringTransactions:
    """Test Recurring Transaction endpoints - Feature 3"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_recurring_status(self, auth_headers):
        """Test GET /api/recurring/status - get due items"""
        response = requests.get(f"{BASE_URL}/api/recurring/status", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "due_income" in data
        assert "due_expenses" in data
        assert "due_debts" in data
        assert "total_due" in data
        assert isinstance(data["due_income"], list)
        assert isinstance(data["due_expenses"], list)
        assert isinstance(data["due_debts"], list)
        assert isinstance(data["total_due"], int)
    
    def test_get_recurring_settings(self, auth_headers):
        """Test GET /api/recurring/settings - get user settings"""
        response = requests.get(f"{BASE_URL}/api/recurring/settings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "auto_process" in data
        assert "notify_before_days" in data
    
    def test_update_recurring_settings(self, auth_headers):
        """Test PUT /api/recurring/settings - update settings"""
        response = requests.put(
            f"{BASE_URL}/api/recurring/settings?auto_process=false&notify_before_days=3",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestMultitenancy:
    """Test Multi-tenancy Cross-Entity endpoints - Feature 4"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_cross_entity_summary(self, auth_headers):
        """Test GET /api/multitenancy/cross-entity-summary"""
        response = requests.get(f"{BASE_URL}/api/multitenancy/cross-entity-summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "entities" in data
        assert "total_net_worth" in data
        assert "entity_count" in data
        assert isinstance(data["entities"], list)
        # Verify entity structure if data exists
        if len(data["entities"]) > 0:
            entity = data["entities"][0]
            assert "entity_id" in entity
            assert "entity_name" in entity
            assert "total_cash" in entity
            assert "total_debt" in entity
            assert "total_investments" in entity
            assert "net_worth" in entity
    
    def test_entity_comparison(self, auth_headers):
        """Test GET /api/multitenancy/entity-comparison"""
        response = requests.get(f"{BASE_URL}/api/multitenancy/entity-comparison", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "comparisons" in data
        assert "month" in data
        assert isinstance(data["comparisons"], list)
        # Verify comparison structure if data exists
        if len(data["comparisons"]) > 0:
            comp = data["comparisons"][0]
            assert "entity_id" in comp
            assert "entity_name" in comp
            assert "monthly_income" in comp
            assert "monthly_expenses" in comp
            assert "monthly_net" in comp
            assert "transaction_count" in comp


class TestPDFExport:
    """Test PDF Export endpoints - Feature 5"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_export_dashboard_pdf(self, auth_headers):
        """Test GET /api/pdf/dashboard - export dashboard as PDF"""
        response = requests.get(f"{BASE_URL}/api/pdf/dashboard", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        # Verify PDF content starts with PDF magic bytes
        assert response.content[:4] == b'%PDF'
    
    def test_export_transactions_pdf(self, auth_headers):
        """Test GET /api/pdf/transactions - export transactions as PDF"""
        response = requests.get(f"{BASE_URL}/api/pdf/transactions", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert response.content[:4] == b'%PDF'
    
    def test_export_transactions_pdf_with_dates(self, auth_headers):
        """Test GET /api/pdf/transactions with date filters"""
        response = requests.get(
            f"{BASE_URL}/api/pdf/transactions?start_date=2024-01-01&end_date=2024-12-31",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
    
    def test_export_portfolio_pdf(self, auth_headers):
        """Test GET /api/pdf/portfolio - export portfolio as PDF with charts"""
        response = requests.get(f"{BASE_URL}/api/pdf/portfolio", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert response.content[:4] == b'%PDF'


class TestPWAManifest:
    """Test PWA manifest and service worker - Feature 6"""
    
    def test_manifest_json(self):
        """Test manifest.json is accessible"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "short_name" in data
        assert "start_url" in data
        assert "display" in data
        assert "icons" in data
        assert data["name"] == "BlackieFi - Personal Finance"
        assert data["display"] == "standalone"
    
    def test_service_worker(self):
        """Test service worker file is accessible"""
        response = requests.get(f"{BASE_URL}/sw.js")
        assert response.status_code == 200
        # Verify it's JavaScript content
        content = response.text
        assert "self.addEventListener" in content or "CACHE_NAME" in content


class TestExistingFeatures:
    """Regression tests for existing features"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
    
    def test_dashboard_unified(self, auth_headers):
        """Test unified dashboard"""
        response = requests.get(f"{BASE_URL}/api/dashboard/unified", headers=auth_headers)
        assert response.status_code == 200
    
    def test_accounts_list(self, auth_headers):
        """Test accounts list"""
        response = requests.get(f"{BASE_URL}/api/accounts/", headers=auth_headers)
        assert response.status_code == 200
    
    def test_income_list(self, auth_headers):
        """Test income list"""
        response = requests.get(f"{BASE_URL}/api/income/", headers=auth_headers)
        assert response.status_code == 200
    
    def test_expenses_list(self, auth_headers):
        """Test expenses list"""
        response = requests.get(f"{BASE_URL}/api/expenses/", headers=auth_headers)
        assert response.status_code == 200
    
    def test_debts_list(self, auth_headers):
        """Test debts list"""
        response = requests.get(f"{BASE_URL}/api/debts/", headers=auth_headers)
        assert response.status_code == 200
    
    def test_transactions_list(self, auth_headers):
        """Test transactions list"""
        response = requests.get(f"{BASE_URL}/api/transactions/", headers=auth_headers)
        assert response.status_code == 200
    
    def test_entities_list(self, auth_headers):
        """Test entities list"""
        response = requests.get(f"{BASE_URL}/api/entities/", headers=auth_headers)
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
