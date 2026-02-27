"""
Test suite for BlackieFi new features:
- Bills API
- Reports API
- Tax Planning API
- Groups API (admin only)
- Financial Profiles API (admin only)
- Imports API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USER = {"username": "demo", "password": "user123"}


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get headers with admin auth"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def entity_id(self, admin_headers):
        """Get first entity ID for testing"""
        response = requests.get(f"{BASE_URL}/api/entities", headers=admin_headers)
        assert response.status_code == 200
        entities = response.json()
        if entities:
            return entities[0]["id"]
        # Create entity if none exists
        response = requests.post(
            f"{BASE_URL}/api/entities",
            headers=admin_headers,
            json={"name": "TEST_Entity", "type": "personal"}
        )
        assert response.status_code in [200, 201]
        return response.json()["id"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"


class TestBillsAPI:
    """Bills endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def entity_id(self, admin_headers):
        response = requests.get(f"{BASE_URL}/api/entities", headers=admin_headers)
        entities = response.json()
        return entities[0]["id"] if entities else None
    
    def test_get_bills(self, admin_headers):
        """Test GET /api/bills returns 200"""
        response = requests.get(f"{BASE_URL}/api/bills", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_bills_with_entity(self, admin_headers, entity_id):
        """Test GET /api/bills with entity_id filter"""
        if not entity_id:
            pytest.skip("No entity available")
        response = requests.get(f"{BASE_URL}/api/bills?entity_id={entity_id}", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_bill(self, admin_headers, entity_id):
        """Test POST /api/bills creates a bill"""
        if not entity_id:
            pytest.skip("No entity available")
        bill_data = {
            "entity_id": entity_id,
            "name": "TEST_Electric Bill",
            "typical_amount": 150.00,
            "due_date": "2026-02-15",
            "frequency": "monthly",
            "category_id": None,
            "auto_pay": False,
            "reminder_days": 5
        }
        response = requests.post(f"{BASE_URL}/api/bills", headers=admin_headers, json=bill_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Electric Bill"
        assert "id" in data
        return data["id"]


class TestReportsAPI:
    """Reports endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def entity_id(self, admin_headers):
        response = requests.get(f"{BASE_URL}/api/entities", headers=admin_headers)
        entities = response.json()
        return entities[0]["id"] if entities else None
    
    def test_generate_profit_loss_report(self, admin_headers, entity_id):
        """Test POST /api/reports/generate with profit_loss type"""
        if not entity_id:
            pytest.skip("No entity available")
        report_data = {
            "report_type": "profit_loss",
            "entity_id": entity_id,
            "start_date": "2025-01-01",
            "end_date": "2025-12-31"
        }
        response = requests.post(f"{BASE_URL}/api/reports/generate", headers=admin_headers, json=report_data)
        assert response.status_code == 200
        data = response.json()
        assert data["report_type"] == "profit_loss"
        assert "report_data" in data
    
    def test_generate_balance_sheet_report(self, admin_headers, entity_id):
        """Test POST /api/reports/generate with balance_sheet type"""
        if not entity_id:
            pytest.skip("No entity available")
        report_data = {
            "report_type": "balance_sheet",
            "entity_id": entity_id,
            "start_date": "2025-01-01",
            "end_date": "2025-12-31"
        }
        response = requests.post(f"{BASE_URL}/api/reports/generate", headers=admin_headers, json=report_data)
        assert response.status_code == 200
        data = response.json()
        assert data["report_type"] == "balance_sheet"
    
    def test_generate_cash_flow_report(self, admin_headers, entity_id):
        """Test POST /api/reports/generate with cash_flow type"""
        if not entity_id:
            pytest.skip("No entity available")
        report_data = {
            "report_type": "cash_flow",
            "entity_id": entity_id,
            "start_date": "2025-01-01",
            "end_date": "2025-12-31"
        }
        response = requests.post(f"{BASE_URL}/api/reports/generate", headers=admin_headers, json=report_data)
        assert response.status_code == 200
        data = response.json()
        assert data["report_type"] == "cash_flow"
    
    def test_generate_budget_vs_actual_report(self, admin_headers, entity_id):
        """Test POST /api/reports/generate with budget_vs_actual type"""
        if not entity_id:
            pytest.skip("No entity available")
        report_data = {
            "report_type": "budget_vs_actual",
            "entity_id": entity_id,
            "start_date": "2025-01-01",
            "end_date": "2025-12-31"
        }
        response = requests.post(f"{BASE_URL}/api/reports/generate", headers=admin_headers, json=report_data)
        assert response.status_code == 200
        data = response.json()
        assert data["report_type"] == "budget_vs_actual"
    
    def test_get_report_presets(self, admin_headers):
        """Test GET /api/reports/presets"""
        response = requests.get(f"{BASE_URL}/api/reports/presets", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestTaxAPI:
    """Tax Planning endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def entity_id(self, admin_headers):
        response = requests.get(f"{BASE_URL}/api/entities", headers=admin_headers)
        entities = response.json()
        return entities[0]["id"] if entities else None
    
    def test_get_tax_scenarios(self, admin_headers, entity_id):
        """Test GET /api/tax/scenarios returns 200"""
        if not entity_id:
            pytest.skip("No entity available")
        response = requests.get(f"{BASE_URL}/api/tax/scenarios?entity_id={entity_id}", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_tax_scenario(self, admin_headers, entity_id):
        """Test POST /api/tax/scenarios creates a scenario"""
        if not entity_id:
            pytest.skip("No entity available")
        scenario_data = {
            "entity_id": entity_id,
            "tax_year": 2025,
            "name": "TEST_Tax Scenario",
            "filing_status": "single",
            "estimated_income": 75000,
            "estimated_deductions": 15000,
            "estimated_credits": 2000,
            "estimated_tax": 12000,
            "notes": "Test scenario"
        }
        response = requests.post(f"{BASE_URL}/api/tax/scenarios", headers=admin_headers, json=scenario_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Tax Scenario"
        assert "id" in data


class TestGroupsAPI:
    """Groups endpoint tests (admin only)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_get_groups(self, admin_headers):
        """Test GET /api/groups returns 200 for admin"""
        response = requests.get(f"{BASE_URL}/api/groups", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_group(self, admin_headers):
        """Test POST /api/groups creates a group"""
        group_data = {
            "name": "TEST_Finance Team",
            "description": "Test group for finance team"
        }
        response = requests.post(f"{BASE_URL}/api/groups", headers=admin_headers, json=group_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Finance Team"
        assert "id" in data
        return data["id"]


class TestFinancialProfilesAPI:
    """Financial Profiles endpoint tests (admin only)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def entity_id(self, admin_headers):
        response = requests.get(f"{BASE_URL}/api/entities", headers=admin_headers)
        entities = response.json()
        return entities[0]["id"] if entities else None
    
    def test_get_financial_profiles(self, admin_headers):
        """Test GET /api/financial-profiles returns 200 for admin"""
        response = requests.get(f"{BASE_URL}/api/financial-profiles", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_financial_profile(self, admin_headers, entity_id):
        """Test POST /api/financial-profiles creates a profile"""
        if not entity_id:
            pytest.skip("No entity available")
        profile_data = {
            "entity_id": entity_id,
            "risk_tolerance": "moderate",
            "investment_experience": "intermediate",
            "time_horizon": 10,
            "liquidity_needs": "medium",
            "age": 35,
            "annual_income": 100000,
            "financial_goals": [
                {"goal": "Retirement", "target_amount": 1000000, "timeline_years": 25}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/financial-profiles", headers=admin_headers, json=profile_data)
        assert response.status_code == 200
        data = response.json()
        assert data["risk_tolerance"] == "moderate"
        assert "id" in data


class TestImportsAPI:
    """Imports endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_get_import_batches(self, admin_headers):
        """Test GET /api/imports/batches returns 200"""
        response = requests.get(f"{BASE_URL}/api/imports/batches", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestNavigationPages:
    """Test that all new pages are accessible"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
    
    def test_entities_endpoint(self, admin_headers):
        """Test entities endpoint"""
        response = requests.get(f"{BASE_URL}/api/entities", headers=admin_headers)
        assert response.status_code == 200
    
    def test_accounts_endpoint(self, admin_headers):
        """Test accounts endpoint"""
        response = requests.get(f"{BASE_URL}/api/accounts", headers=admin_headers)
        assert response.status_code == 200
    
    def test_categories_endpoint(self, admin_headers):
        """Test categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=admin_headers)
        assert response.status_code == 200
    
    def test_transactions_endpoint(self, admin_headers):
        """Test transactions endpoint"""
        response = requests.get(f"{BASE_URL}/api/transactions", headers=admin_headers)
        assert response.status_code == 200
    
    def test_budgets_endpoint(self, admin_headers):
        """Test budgets endpoint"""
        response = requests.get(f"{BASE_URL}/api/budgets", headers=admin_headers)
        assert response.status_code == 200
    
    def test_debts_endpoint(self, admin_headers):
        """Test debts endpoint"""
        response = requests.get(f"{BASE_URL}/api/debts", headers=admin_headers)
        assert response.status_code == 200
    
    def test_recurring_endpoint(self, admin_headers):
        """Test recurring transactions endpoint"""
        response = requests.get(f"{BASE_URL}/api/recurring", headers=admin_headers)
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
