"""
BlackieFi 3.0 API Tests
Tests all CRUD operations for: Auth, Income, Expenses, Debts, Accounts, Investments, Budgets, Calendar, Savings, Settings
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://portfolio-analytics-33.preview.emergentagent.com"

# Demo credentials
DEMO_EMAIL = "demo@blackiefi.com"
DEMO_PASSWORD = "Demo123!"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")
    
    def test_auth_health(self):
        """Test auth service health"""
        response = requests.get(f"{BASE_URL}/api/auth/health")
        assert response.status_code == 200
        print("✓ Auth health check passed")
    
    def test_login_demo_user(self):
        """Test login with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == DEMO_EMAIL
        print(f"✓ Login successful for {DEMO_EMAIL}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")
    
    def test_register_new_user(self):
        """Test user registration"""
        test_email = f"test_{datetime.now().strftime('%Y%m%d%H%M%S')}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "full_name": "Test User"
        })
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["onboarding_complete"] == False
        print(f"✓ Registration successful for {test_email}")
    
    def test_get_current_user(self):
        """Test /auth/me endpoint"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL, "password": DEMO_PASSWORD
        })
        token = login_resp.json()["access_token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == DEMO_EMAIL
        print("✓ Get current user passed")


@pytest.fixture
def auth_headers():
    """Get auth headers for demo user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DEMO_EMAIL, "password": DEMO_PASSWORD
    })
    token = response.json()["access_token"]
    entity_id = response.json()["user"]["personal_entity_id"]
    return {"Authorization": f"Bearer {token}"}, entity_id


class TestIncomeEndpoints:
    """Income CRUD tests"""
    
    def test_list_income(self, auth_headers):
        """Test listing income sources"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/income/?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} income sources")
    
    def test_create_income(self, auth_headers):
        """Test creating income source"""
        headers, entity_id = auth_headers
        response = requests.post(f"{BASE_URL}/api/income/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_Salary",
            "income_type": "salary",
            "amount": 5000.00,
            "frequency": "monthly",
            "is_variable": False
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_Salary"
        assert data["amount"] == 5000.00
        print(f"✓ Created income: {data['id']}")
        return data["id"]
    
    def test_update_income(self, auth_headers):
        """Test updating income source"""
        headers, entity_id = auth_headers
        # Create first
        create_resp = requests.post(f"{BASE_URL}/api/income/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_UpdateIncome",
            "income_type": "freelance",
            "amount": 1000.00,
            "frequency": "monthly"
        })
        income_id = create_resp.json()["id"]
        
        # Update
        response = requests.put(f"{BASE_URL}/api/income/{income_id}?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_UpdatedIncome",
            "income_type": "freelance",
            "amount": 1500.00,
            "frequency": "biweekly"
        })
        assert response.status_code == 200
        assert response.json()["amount"] == 1500.00
        print(f"✓ Updated income: {income_id}")
    
    def test_delete_income(self, auth_headers):
        """Test deleting income source"""
        headers, entity_id = auth_headers
        # Create first
        create_resp = requests.post(f"{BASE_URL}/api/income/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_DeleteIncome",
            "income_type": "other",
            "amount": 500.00,
            "frequency": "monthly"
        })
        income_id = create_resp.json()["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/income/{income_id}?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        print(f"✓ Deleted income: {income_id}")
    
    def test_receive_income(self, auth_headers):
        """Test marking income as received"""
        headers, entity_id = auth_headers
        # Create income
        create_resp = requests.post(f"{BASE_URL}/api/income/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_ReceiveIncome",
            "income_type": "salary",
            "amount": 2000.00,
            "frequency": "monthly"
        })
        income_id = create_resp.json()["id"]
        
        # Receive
        response = requests.post(f"{BASE_URL}/api/income/{income_id}/receive?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        assert "transaction_id" in response.json()
        print(f"✓ Income received, transaction created")


class TestExpenseEndpoints:
    """Expense CRUD tests"""
    
    def test_list_expenses(self, auth_headers):
        """Test listing expenses"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/expenses/?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} expenses")
    
    def test_create_expense(self, auth_headers):
        """Test creating expense"""
        headers, entity_id = auth_headers
        response = requests.post(f"{BASE_URL}/api/expenses/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_Rent",
            "amount": 1500.00,
            "is_recurring": True,
            "frequency": "monthly"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_Rent"
        print(f"✓ Created expense: {data['id']}")
    
    def test_pay_expense(self, auth_headers):
        """Test marking expense as paid"""
        headers, entity_id = auth_headers
        # Create expense
        create_resp = requests.post(f"{BASE_URL}/api/expenses/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_PayExpense",
            "amount": 100.00,
            "is_recurring": True,
            "frequency": "monthly"
        })
        expense_id = create_resp.json()["id"]
        
        # Pay
        response = requests.post(f"{BASE_URL}/api/expenses/{expense_id}/pay?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        assert "transaction_id" in response.json()
        print(f"✓ Expense paid, transaction created")


class TestDebtEndpoints:
    """Debt CRUD tests"""
    
    def test_list_debts(self, auth_headers):
        """Test listing debts"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/debts/?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} debts")
    
    def test_create_debt(self, auth_headers):
        """Test creating debt"""
        headers, entity_id = auth_headers
        response = requests.post(f"{BASE_URL}/api/debts/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_CarLoan",
            "debt_type": "loan",
            "original_amount": 20000.00,
            "current_balance": 15000.00,
            "interest_rate": 5.5,
            "minimum_payment": 350.00,
            "frequency": "monthly"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_CarLoan"
        assert data["current_balance"] == 15000.00
        print(f"✓ Created debt: {data['id']}")
    
    def test_make_debt_payment(self, auth_headers):
        """Test making debt payment"""
        headers, entity_id = auth_headers
        # Create debt
        create_resp = requests.post(f"{BASE_URL}/api/debts/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_PaymentDebt",
            "debt_type": "credit_card",
            "original_amount": 5000.00,
            "current_balance": 3000.00,
            "interest_rate": 18.0,
            "frequency": "monthly"
        })
        debt_id = create_resp.json()["id"]
        
        # Make payment
        response = requests.post(f"{BASE_URL}/api/debts/{debt_id}/payment?entity_id={entity_id}&amount=500", headers=headers)
        assert response.status_code == 200
        assert response.json()["new_balance"] == 2500.00
        print(f"✓ Debt payment recorded, new balance: 2500")


class TestAccountEndpoints:
    """Account CRUD tests"""
    
    def test_list_accounts(self, auth_headers):
        """Test listing accounts"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/accounts/?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} accounts")
    
    def test_create_account(self, auth_headers):
        """Test creating account"""
        headers, entity_id = auth_headers
        response = requests.post(f"{BASE_URL}/api/accounts/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_Checking",
            "account_type": "checking",
            "institution": "Test Bank",
            "balance": 5000.00,
            "currency": "USD"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_Checking"
        assert data["balance"] == 5000.00
        print(f"✓ Created account: {data['id']}")
    
    def test_update_account(self, auth_headers):
        """Test updating account"""
        headers, entity_id = auth_headers
        # Create
        create_resp = requests.post(f"{BASE_URL}/api/accounts/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_UpdateAccount",
            "account_type": "savings",
            "balance": 1000.00,
            "currency": "USD"
        })
        account_id = create_resp.json()["id"]
        
        # Update
        response = requests.put(f"{BASE_URL}/api/accounts/{account_id}?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_UpdatedAccount",
            "account_type": "savings",
            "balance": 2000.00,
            "currency": "USD"
        })
        assert response.status_code == 200
        assert response.json()["balance"] == 2000.00
        print(f"✓ Updated account: {account_id}")


class TestInvestmentEndpoints:
    """Investment vehicles and holdings tests"""
    
    def test_list_vehicles(self, auth_headers):
        """Test listing investment vehicles"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/investments/vehicles/?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} vehicles")
    
    def test_create_vehicle(self, auth_headers):
        """Test creating investment vehicle"""
        headers, entity_id = auth_headers
        response = requests.post(f"{BASE_URL}/api/investments/vehicles/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_401k",
            "vehicle_type": "401k",
            "provider": "Fidelity"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_401k"
        print(f"✓ Created vehicle: {data['id']}")
        return data["id"]
    
    def test_create_holding(self, auth_headers):
        """Test creating holding"""
        headers, entity_id = auth_headers
        # Create vehicle first
        vehicle_resp = requests.post(f"{BASE_URL}/api/investments/vehicles/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_Brokerage",
            "vehicle_type": "brokerage"
        })
        vehicle_id = vehicle_resp.json()["id"]
        
        # Create holding
        response = requests.post(f"{BASE_URL}/api/investments/holdings/?entity_id={entity_id}", headers=headers, json={
            "vehicle_id": vehicle_id,
            "asset_name": "AAPL",
            "quantity": 10,
            "cost_basis": 150.00,
            "current_price": 175.00
        })
        assert response.status_code == 201
        data = response.json()
        assert data["asset_name"] == "AAPL"
        print(f"✓ Created holding: {data['id']}")


class TestBudgetEndpoints:
    """Budget CRUD tests"""
    
    def test_list_budgets(self, auth_headers):
        """Test listing budgets"""
        headers, entity_id = auth_headers
        year = datetime.now().year
        response = requests.get(f"{BASE_URL}/api/budgets/?entity_id={entity_id}&year={year}", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} budgets for {year}")
    
    def test_create_budget(self, auth_headers):
        """Test creating budget"""
        headers, entity_id = auth_headers
        # Use a unique future year to avoid conflicts
        import random
        month = random.randint(1, 12)
        year = datetime.now().year + random.randint(10, 50)
        
        response = requests.post(f"{BASE_URL}/api/budgets/?entity_id={entity_id}", headers=headers, json={
            "month": month,
            "year": year,
            "items": [
                {"category_id": "test-cat-1", "category_name": "Food", "planned_amount": 500},
                {"category_id": "test-cat-2", "category_name": "Transport", "planned_amount": 200}
            ]
        })
        assert response.status_code == 201
        data = response.json()
        assert data["month"] == month
        assert data["year"] == year
        print(f"✓ Created budget for {month}/{year}")
    
    def test_copy_budget(self, auth_headers):
        """Test copying budget"""
        headers, entity_id = auth_headers
        # Create source budget with unique year
        import random
        source_month = random.randint(1, 6)
        source_year = datetime.now().year + random.randint(60, 100)
        create_resp = requests.post(f"{BASE_URL}/api/budgets/?entity_id={entity_id}", headers=headers, json={
            "month": source_month,
            "year": source_year,
            "items": [{"category_id": "cat-1", "category_name": "Test", "planned_amount": 100}]
        })
        assert create_resp.status_code == 201, f"Failed to create source budget: {create_resp.text}"
        budget_id = create_resp.json()["id"]
        
        # Copy to next month
        target_month = source_month + 6
        response = requests.post(
            f"{BASE_URL}/api/budgets/{budget_id}/copy?entity_id={entity_id}&target_month={target_month}&target_year={source_year}",
            headers=headers
        )
        assert response.status_code == 200
        assert "id" in response.json()
        print(f"✓ Budget copied to {target_month}/{source_year}")


class TestCalendarEndpoints:
    """Calendar events tests"""
    
    def test_get_calendar_events(self, auth_headers):
        """Test getting calendar events"""
        headers, entity_id = auth_headers
        now = datetime.now()
        start = now.replace(day=1).isoformat()
        end = (now.replace(day=28) + timedelta(days=4)).replace(day=1).isoformat()
        
        response = requests.get(
            f"{BASE_URL}/api/calendar/events?entity_id={entity_id}&start={start}&end={end}",
            headers=headers
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} calendar events")
    
    def test_create_calendar_event(self, auth_headers):
        """Test creating manual calendar event"""
        headers, entity_id = auth_headers
        event_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/calendar/events?entity_id={entity_id}", headers=headers, json={
            "title": "TEST_Meeting",
            "event_type": "custom",
            "date": f"{event_date}T10:00:00Z",
            "description": "Test event"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "TEST_Meeting"
        print(f"✓ Created calendar event: {data['id']}")
        return data["id"]
    
    def test_delete_calendar_event(self, auth_headers):
        """Test deleting calendar event"""
        headers, entity_id = auth_headers
        # Create event
        event_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        create_resp = requests.post(f"{BASE_URL}/api/calendar/events?entity_id={entity_id}", headers=headers, json={
            "title": "TEST_DeleteEvent",
            "event_type": "custom",
            "date": f"{event_date}T10:00:00Z"
        })
        event_id = create_resp.json()["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/calendar/events/{event_id}?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        print(f"✓ Deleted calendar event: {event_id}")


class TestSavingsFundEndpoints:
    """Savings fund CRUD tests"""
    
    def test_list_savings_funds(self, auth_headers):
        """Test listing savings funds"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/savings-funds/?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} savings funds")
    
    def test_create_savings_fund(self, auth_headers):
        """Test creating savings fund"""
        headers, entity_id = auth_headers
        response = requests.post(f"{BASE_URL}/api/savings-funds/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_Vacation",
            "target_amount": 5000.00,
            "current_amount": 1000.00
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_Vacation"
        assert data["target_amount"] == 5000.00
        print(f"✓ Created savings fund: {data['id']}")
    
    def test_contribute_to_fund(self, auth_headers):
        """Test contributing to savings fund"""
        headers, entity_id = auth_headers
        # Create fund
        create_resp = requests.post(f"{BASE_URL}/api/savings-funds/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_ContributeFund",
            "target_amount": 2000.00,
            "current_amount": 500.00
        })
        fund_id = create_resp.json()["id"]
        
        # Contribute
        response = requests.post(f"{BASE_URL}/api/savings-funds/{fund_id}/contribute?entity_id={entity_id}&amount=250", headers=headers)
        assert response.status_code == 200
        assert response.json()["new_amount"] == 750.00
        print(f"✓ Contributed to fund, new amount: 750")


class TestDashboardEndpoints:
    """Dashboard tests"""
    
    def test_unified_dashboard(self, auth_headers):
        """Test unified dashboard"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/dashboard/unified?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_balance" in data
        assert "total_debt" in data
        assert "net_worth" in data
        print(f"✓ Unified dashboard: Net worth = ${data.get('net_worth', 0):,.2f}")
    
    def test_entity_dashboard(self, auth_headers):
        """Test entity-specific dashboard"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/dashboard/entity/{entity_id}?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_balance" in data
        print(f"✓ Entity dashboard loaded")


class TestEntityEndpoints:
    """Entity management tests"""
    
    def test_list_entities(self, auth_headers):
        """Test listing entities"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/entities/?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        entities = response.json()
        assert isinstance(entities, list)
        assert len(entities) >= 1  # At least personal entity
        print(f"✓ Listed {len(entities)} entities")
    
    def test_create_business_entity(self, auth_headers):
        """Test creating business entity"""
        headers, entity_id = auth_headers
        response = requests.post(f"{BASE_URL}/api/entities/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_Business LLC",
            "entity_type": "business",
            "business_type": "llc"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_Business LLC"
        assert data["is_personal"] == False
        print(f"✓ Created business entity: {data['id']}")
    
    def test_get_entity_users(self, auth_headers):
        """Test getting entity users"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/entities/{entity_id}/users?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Listed entity users")


class TestCategoryEndpoints:
    """Category tests"""
    
    def test_list_categories(self, auth_headers):
        """Test listing categories"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/categories/?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        categories = response.json()
        assert isinstance(categories, list)
        assert len(categories) > 0  # Should have default categories
        print(f"✓ Listed {len(categories)} categories")
    
    def test_create_category(self, auth_headers):
        """Test creating category"""
        headers, entity_id = auth_headers
        response = requests.post(f"{BASE_URL}/api/categories/?entity_id={entity_id}", headers=headers, json={
            "name": "TEST_Category",
            "color": "#ff5733"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "TEST_Category"
        print(f"✓ Created category: {data['id']}")


class TestRoleEndpoints:
    """Role tests"""
    
    def test_list_roles(self, auth_headers):
        """Test listing roles"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/roles/?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        roles = response.json()
        assert isinstance(roles, list)
        assert len(roles) >= 3  # admin, power_user, regular_user
        print(f"✓ Listed {len(roles)} roles")


class TestTransactionEndpoints:
    """Transaction tests"""
    
    def test_list_transactions(self, auth_headers):
        """Test listing transactions"""
        headers, entity_id = auth_headers
        response = requests.get(f"{BASE_URL}/api/transactions/?entity_id={entity_id}", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} transactions")
    
    def test_create_transaction(self, auth_headers):
        """Test creating transaction"""
        headers, entity_id = auth_headers
        response = requests.post(f"{BASE_URL}/api/transactions/?entity_id={entity_id}", headers=headers, json={
            "transaction_type": "expense",
            "amount": 50.00,
            "description": "TEST_Transaction"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["description"] == "TEST_Transaction"
        print(f"✓ Created transaction: {data['id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
