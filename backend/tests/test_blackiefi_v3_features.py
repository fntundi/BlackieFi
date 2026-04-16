"""
BlackieFi 3.0 Feature Tests - Comprehensive API testing for new features:
- MFA/TOTP authentication
- AI Settings (Ollama integration)
- Notifications system
- Currency conversion
- Data import/export
- RAG Q&A
- Dashboard and existing features regression
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials — loaded from env or test_credentials.md defaults
TEST_EMAIL = os.environ.get("TEST_EMAIL", "demo@blackiefi.com")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "Demo123!")


class TestAuthAndMFA:
    """Authentication and MFA endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token for authenticated tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user = data.get("user", {})
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
    
    def test_mfa_status(self):
        """Test MFA status endpoint returns mfa_enabled field"""
        response = requests.get(f"{BASE_URL}/api/auth/mfa/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "mfa_enabled" in data
        assert isinstance(data["mfa_enabled"], bool)
        # Demo user should have MFA disabled by default
        assert data["mfa_enabled"] == False
    
    def test_mfa_setup_returns_qr_and_secret(self):
        """Test MFA setup returns QR code and secret"""
        response = requests.post(f"{BASE_URL}/api/auth/mfa/setup", headers=self.headers)
        # Should succeed if MFA not already enabled
        if response.status_code == 200:
            data = response.json()
            assert "secret" in data
            assert "qr_code" in data
            assert "uri" in data
            assert data["qr_code"].startswith("data:image/png;base64,")
            assert len(data["secret"]) > 10
        elif response.status_code == 400:
            # MFA already enabled - acceptable
            assert "already enabled" in response.json().get("detail", "").lower()


class TestAISettings:
    """AI Settings endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_ai_settings_default_off(self):
        """Test AI settings returns ai_enabled: false by default"""
        response = requests.get(f"{BASE_URL}/api/ai/settings", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "ai_enabled" in data
        assert "ai_available" in data
        assert "ai_model" in data
        # Default should be off
        assert data["ai_enabled"] == False
        # Ollama not running in preview
        assert data["ai_available"] == False
    
    def test_toggle_ai_settings_on(self):
        """Test enabling AI settings"""
        response = requests.put(f"{BASE_URL}/api/ai/settings", 
                               headers=self.headers,
                               json={"ai_enabled": True, "ollama_model": "phi"})
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        
        # Verify it was enabled
        verify = requests.get(f"{BASE_URL}/api/ai/settings", headers=self.headers)
        assert verify.status_code == 200
        assert verify.json()["ai_enabled"] == True
    
    def test_toggle_ai_settings_off(self):
        """Test disabling AI settings"""
        response = requests.put(f"{BASE_URL}/api/ai/settings", 
                               headers=self.headers,
                               json={"ai_enabled": False, "ollama_model": "phi"})
        assert response.status_code == 200
        
        # Verify it was disabled
        verify = requests.get(f"{BASE_URL}/api/ai/settings", headers=self.headers)
        assert verify.status_code == 200
        assert verify.json()["ai_enabled"] == False
    
    def test_ai_chat_disabled_returns_400(self):
        """Test AI chat returns 400 when AI is disabled"""
        # First ensure AI is disabled
        requests.put(f"{BASE_URL}/api/ai/settings", 
                    headers=self.headers,
                    json={"ai_enabled": False, "ollama_model": "phi"})
        
        response = requests.post(f"{BASE_URL}/api/ai/chat", 
                                headers=self.headers,
                                json={"message": "Hello"})
        assert response.status_code == 400
        assert "disabled" in response.json().get("detail", "").lower()


class TestNotifications:
    """Notification system endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_notifications(self):
        """Test listing notifications returns array"""
        response = requests.get(f"{BASE_URL}/api/notifications/", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_unread_count(self):
        """Test unread count returns count field"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        assert data["count"] >= 0
    
    def test_upcoming_reminders(self):
        """Test upcoming reminders returns array"""
        response = requests.get(f"{BASE_URL}/api/notifications/upcoming", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_upcoming_reminders_with_days_param(self):
        """Test upcoming reminders with days parameter"""
        response = requests.get(f"{BASE_URL}/api/notifications/upcoming?days=30", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestCurrency:
    """Currency conversion endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_exchange_rates(self):
        """Test exchange rates returns 34+ currencies"""
        response = requests.get(f"{BASE_URL}/api/currency/rates", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "base" in data
        assert "rates" in data
        assert "currencies" in data
        assert data["base"] == "USD"
        assert len(data["rates"]) >= 34
        # Check some common currencies
        assert "EUR" in data["rates"]
        assert "GBP" in data["rates"]
        assert "JPY" in data["rates"]
    
    def test_convert_usd_to_eur(self):
        """Test currency conversion USD to EUR"""
        response = requests.get(f"{BASE_URL}/api/currency/convert?amount=100&from_currency=USD&to_currency=EUR", 
                               headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "amount" in data
        assert "from" in data
        assert "to" in data
        assert "result" in data
        assert "rate" in data
        assert data["amount"] == 100
        assert data["from"] == "USD"
        assert data["to"] == "EUR"
        assert data["result"] > 0
    
    def test_convert_usd_to_jpy(self):
        """Test currency conversion USD to JPY"""
        response = requests.get(f"{BASE_URL}/api/currency/convert?amount=1000&from_currency=USD&to_currency=JPY", 
                               headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["result"] > 100000  # JPY should be much larger number
    
    def test_convert_invalid_currency(self):
        """Test conversion with invalid currency returns 400"""
        response = requests.get(f"{BASE_URL}/api/currency/convert?amount=100&from_currency=INVALID&to_currency=EUR", 
                               headers=self.headers)
        assert response.status_code == 400
    
    def test_get_currency_settings(self):
        """Test getting user currency settings"""
        response = requests.get(f"{BASE_URL}/api/currency/settings", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "base_currency" in data
        assert "display_currencies" in data
        assert "supported" in data
    
    def test_update_currency_settings(self):
        """Test updating user currency settings"""
        response = requests.put(f"{BASE_URL}/api/currency/settings", 
                               headers=self.headers,
                               json={"base_currency": "EUR", "display_currencies": ["EUR", "USD", "GBP"]})
        assert response.status_code == 200
        assert response.json().get("status") == "ok"
        
        # Verify update
        verify = requests.get(f"{BASE_URL}/api/currency/settings", headers=self.headers)
        assert verify.json()["base_currency"] == "EUR"
        
        # Reset to USD
        requests.put(f"{BASE_URL}/api/currency/settings", 
                    headers=self.headers,
                    json={"base_currency": "USD", "display_currencies": ["USD", "EUR", "GBP"]})


class TestDataExport:
    """Data export endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_export_transactions_json(self):
        """Test exporting transactions as JSON"""
        response = requests.get(f"{BASE_URL}/api/data/export/transactions?fmt=json", headers=self.headers)
        # May return 404 if no transactions, or 200 with data
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert "application/json" in response.headers.get("content-type", "")
    
    def test_export_expenses_csv(self):
        """Test exporting expenses as CSV"""
        response = requests.get(f"{BASE_URL}/api/data/export/expenses?fmt=csv", headers=self.headers)
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert "text/csv" in response.headers.get("content-type", "")
    
    def test_export_accounts_json(self):
        """Test exporting accounts as JSON"""
        response = requests.get(f"{BASE_URL}/api/data/export/accounts?fmt=json", headers=self.headers)
        assert response.status_code in [200, 404]
    
    def test_export_all(self):
        """Test full data export"""
        response = requests.get(f"{BASE_URL}/api/data/export-all", headers=self.headers)
        assert response.status_code == 200
        assert "application/json" in response.headers.get("content-type", "")
        data = response.json()
        # Should have multiple data types
        assert isinstance(data, dict)


class TestRAG:
    """RAG Q&A endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_rag_status(self):
        """Test RAG status returns available and doc count"""
        response = requests.get(f"{BASE_URL}/api/rag/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        assert "documents_count" in data
        assert isinstance(data["available"], bool)
        assert isinstance(data["documents_count"], int)
    
    def test_rag_documents_list(self):
        """Test listing RAG documents returns array"""
        response = requests.get(f"{BASE_URL}/api/rag/documents", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestDashboardAndExistingFeatures:
    """Regression tests for existing features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_unified(self):
        """Test unified dashboard returns financial summary"""
        response = requests.get(f"{BASE_URL}/api/dashboard/unified", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # Should have financial summary fields
        assert isinstance(data, dict)
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
    
    def test_accounts_list(self):
        """Test accounts listing"""
        response = requests.get(f"{BASE_URL}/api/accounts/", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_income_list(self):
        """Test income listing"""
        response = requests.get(f"{BASE_URL}/api/income/", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_expenses_list(self):
        """Test expenses listing"""
        response = requests.get(f"{BASE_URL}/api/expenses/", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_debts_list(self):
        """Test debts listing"""
        response = requests.get(f"{BASE_URL}/api/debts/", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_entities_list(self):
        """Test entities listing"""
        response = requests.get(f"{BASE_URL}/api/entities/", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
