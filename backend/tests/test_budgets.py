"""
Budget API Tests - Testing Budget Planner endpoints
Tests CRUD operations for budgets and category budget management
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Global session and entity_id for all tests
_session = None
_entity_id = None
_token = None

def get_authenticated_session():
    """Get or create authenticated session"""
    global _session, _entity_id, _token
    
    if _session is None:
        _session = requests.Session()
        _session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = _session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "demo",
            "password": "user123"
        })
        
        if login_response.status_code == 200:
            _token = login_response.json().get("token")  # API returns 'token' not 'access_token'
            _session.headers.update({"Authorization": f"Bearer {_token}"})
            
            # Get entity_id from entities endpoint
            entities_response = _session.get(f"{BASE_URL}/api/entities")
            if entities_response.status_code == 200:
                entities = entities_response.json()
                if entities:
                    _entity_id = entities[0].get("id")
        else:
            raise Exception(f"Authentication failed: {login_response.status_code}")
    
    return _session, _entity_id


class TestBudgetAPI:
    """Budget endpoint tests"""
    
    def test_list_budgets(self):
        """Test GET /api/budgets - List all budgets"""
        session, entity_id = get_authenticated_session()
        
        response = session.get(f"{BASE_URL}/api/budgets", params={"entity_id": entity_id})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} budgets")
        
        # If budgets exist, verify structure
        if data:
            budget = data[0]
            assert "id" in budget, "Budget should have id"
            assert "entity_id" in budget, "Budget should have entity_id"
            assert "month" in budget, "Budget should have month"
            assert "category_budgets" in budget, "Budget should have category_budgets"
            assert "total_planned" in budget, "Budget should have total_planned"
            print(f"Budget structure verified: month={budget['month']}, total_planned={budget['total_planned']}")
    
    def test_get_budget_by_month(self):
        """Test GET /api/budgets with month filter"""
        session, entity_id = get_authenticated_session()
        
        # First get all budgets to find an existing month
        all_budgets = session.get(f"{BASE_URL}/api/budgets", params={"entity_id": entity_id}).json()
        
        if all_budgets:
            test_month = all_budgets[0]["month"]
            response = session.get(f"{BASE_URL}/api/budgets", params={
                "entity_id": entity_id,
                "month": test_month
            })
            assert response.status_code == 200
            data = response.json()
            assert len(data) >= 1, "Should find at least one budget for the month"
            assert data[0]["month"] == test_month, "Month should match filter"
            print(f"Successfully filtered budgets by month: {test_month}")
        else:
            print("No existing budgets to test month filter")
    
    def test_create_budget(self):
        """Test POST /api/budgets - Create a new budget"""
        session, entity_id = get_authenticated_session()
        
        # Use a test month that likely doesn't exist
        test_month = "2099-12"
        
        # First check if budget exists for this month and delete
        existing = session.get(f"{BASE_URL}/api/budgets", params={
            "entity_id": entity_id,
            "month": test_month
        }).json()
        
        for budget in existing:
            session.delete(f"{BASE_URL}/api/budgets/{budget['id']}")
        
        # Get categories for budget
        categories_response = session.get(f"{BASE_URL}/api/categories", params={"entity_id": entity_id})
        categories = categories_response.json() if categories_response.status_code == 200 else []
        expense_categories = [c for c in categories if c.get("type") in ["expense", "both"]]
        
        # Create budget with category budgets
        category_budgets = []
        if expense_categories:
            category_budgets = [
                {"category_id": expense_categories[0]["id"], "planned_amount": 500.0}
            ]
        
        create_payload = {
            "entity_id": entity_id,
            "month": test_month,
            "category_budgets": category_budgets,
            "total_planned": 500.0
        }
        
        response = session.post(f"{BASE_URL}/api/budgets", json=create_payload)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["month"] == test_month, "Month should match"
        assert data["entity_id"] == entity_id, "Entity ID should match"
        assert "id" in data, "Should have id"
        print(f"Successfully created budget for {test_month} with id: {data['id']}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/budgets/{data['id']}")
    
    def test_create_duplicate_budget_fails(self):
        """Test that creating duplicate budget for same month fails"""
        session, entity_id = get_authenticated_session()
        
        test_month = "2099-11"
        
        # Clean up first
        existing = session.get(f"{BASE_URL}/api/budgets", params={
            "entity_id": entity_id,
            "month": test_month
        }).json()
        for budget in existing:
            session.delete(f"{BASE_URL}/api/budgets/{budget['id']}")
        
        # Create first budget
        payload = {
            "entity_id": entity_id,
            "month": test_month,
            "category_budgets": [],
            "total_planned": 0
        }
        
        first_response = session.post(f"{BASE_URL}/api/budgets", json=payload)
        assert first_response.status_code == 201
        budget_id = first_response.json()["id"]
        
        # Try to create duplicate
        duplicate_response = session.post(f"{BASE_URL}/api/budgets", json=payload)
        assert duplicate_response.status_code == 409, f"Expected 409 for duplicate, got {duplicate_response.status_code}"
        print("Correctly rejected duplicate budget creation")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/budgets/{budget_id}")
    
    def test_get_single_budget(self):
        """Test GET /api/budgets/{id} - Get specific budget"""
        session, entity_id = get_authenticated_session()
        
        # Get existing budgets
        budgets = session.get(f"{BASE_URL}/api/budgets", params={"entity_id": entity_id}).json()
        
        if budgets:
            budget_id = budgets[0]["id"]
            response = session.get(f"{BASE_URL}/api/budgets/{budget_id}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert data["id"] == budget_id, "ID should match"
            print(f"Successfully retrieved budget: {budget_id}")
        else:
            print("No budgets to test single get")
    
    def test_get_nonexistent_budget(self):
        """Test GET /api/budgets/{id} with invalid ID returns 404"""
        session, entity_id = get_authenticated_session()
        
        response = session.get(f"{BASE_URL}/api/budgets/nonexistent_id_12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for nonexistent budget")
    
    def test_update_budget(self):
        """Test PUT /api/budgets/{id} - Update budget"""
        session, entity_id = get_authenticated_session()
        
        test_month = "2099-10"
        
        # Clean up and create test budget
        existing = session.get(f"{BASE_URL}/api/budgets", params={
            "entity_id": entity_id,
            "month": test_month
        }).json()
        for budget in existing:
            session.delete(f"{BASE_URL}/api/budgets/{budget['id']}")
        
        # Create budget
        create_response = session.post(f"{BASE_URL}/api/budgets", json={
            "entity_id": entity_id,
            "month": test_month,
            "category_budgets": [],
            "total_planned": 100.0
        })
        budget_id = create_response.json()["id"]
        
        # Get categories
        categories_response = session.get(f"{BASE_URL}/api/categories", params={"entity_id": entity_id})
        categories = categories_response.json() if categories_response.status_code == 200 else []
        expense_categories = [c for c in categories if c.get("type") in ["expense", "both"]]
        
        # Update with new category budgets
        new_category_budgets = []
        if expense_categories:
            new_category_budgets = [
                {"category_id": expense_categories[0]["id"], "planned_amount": 300.0}
            ]
        
        update_payload = {
            "entity_id": entity_id,
            "month": test_month,
            "category_budgets": new_category_budgets,
            "total_planned": 300.0
        }
        
        response = session.put(f"{BASE_URL}/api/budgets/{budget_id}", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["total_planned"] == 300.0, "Total planned should be updated"
        print(f"Successfully updated budget total_planned to 300.0")
        
        # Verify persistence with GET
        get_response = session.get(f"{BASE_URL}/api/budgets/{budget_id}")
        assert get_response.status_code == 200
        assert get_response.json()["total_planned"] == 300.0, "Update should persist"
        print("Update persisted correctly")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/budgets/{budget_id}")
    
    def test_update_category_budgets(self):
        """Test updating category budgets within a budget"""
        session, entity_id = get_authenticated_session()
        
        test_month = "2099-09"
        
        # Clean up
        existing = session.get(f"{BASE_URL}/api/budgets", params={
            "entity_id": entity_id,
            "month": test_month
        }).json()
        for budget in existing:
            session.delete(f"{BASE_URL}/api/budgets/{budget['id']}")
        
        # Get categories
        categories_response = session.get(f"{BASE_URL}/api/categories", params={"entity_id": entity_id})
        categories = categories_response.json() if categories_response.status_code == 200 else []
        expense_categories = [c for c in categories if c.get("type") in ["expense", "both"]]
        
        if len(expense_categories) < 2:
            print("Not enough expense categories to test category budget updates")
            return
        
        # Create budget with one category
        create_response = session.post(f"{BASE_URL}/api/budgets", json={
            "entity_id": entity_id,
            "month": test_month,
            "category_budgets": [
                {"category_id": expense_categories[0]["id"], "planned_amount": 100.0}
            ],
            "total_planned": 100.0
        })
        budget_id = create_response.json()["id"]
        
        # Update to add another category
        update_response = session.put(f"{BASE_URL}/api/budgets/{budget_id}", json={
            "entity_id": entity_id,
            "month": test_month,
            "category_budgets": [
                {"category_id": expense_categories[0]["id"], "planned_amount": 100.0},
                {"category_id": expense_categories[1]["id"], "planned_amount": 200.0}
            ],
            "total_planned": 300.0
        })
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert len(data["category_budgets"]) == 2, "Should have 2 category budgets"
        print(f"Successfully added second category budget")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/budgets/{budget_id}")
    
    def test_delete_budget(self):
        """Test DELETE /api/budgets/{id}"""
        session, entity_id = get_authenticated_session()
        
        test_month = "2099-08"
        
        # Clean up first
        existing = session.get(f"{BASE_URL}/api/budgets", params={
            "entity_id": entity_id,
            "month": test_month
        }).json()
        for budget in existing:
            session.delete(f"{BASE_URL}/api/budgets/{budget['id']}")
        
        # Create budget to delete
        create_response = session.post(f"{BASE_URL}/api/budgets", json={
            "entity_id": entity_id,
            "month": test_month,
            "category_budgets": [],
            "total_planned": 0
        })
        
        assert create_response.status_code == 201, f"Failed to create budget: {create_response.text}"
        budget_id = create_response.json()["id"]
        
        # Delete budget
        delete_response = session.delete(f"{BASE_URL}/api/budgets/{budget_id}")
        assert delete_response.status_code == 204, f"Expected 204, got {delete_response.status_code}"
        print(f"Successfully deleted budget: {budget_id}")
        
        # Verify deletion
        get_response = session.get(f"{BASE_URL}/api/budgets/{budget_id}")
        assert get_response.status_code == 404, "Deleted budget should return 404"
        print("Deletion verified - budget no longer exists")
    
    def test_delete_nonexistent_budget(self):
        """Test DELETE /api/budgets/{id} with invalid ID returns 404"""
        session, entity_id = get_authenticated_session()
        
        response = session.delete(f"{BASE_URL}/api/budgets/nonexistent_id_12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for deleting nonexistent budget")


class TestBudgetLinkedData:
    """Test linked data endpoints used by Budget Planner"""
    
    def test_get_goals_for_budget(self):
        """Test GET /api/goals - Used for linked goals in budget"""
        session, entity_id = get_authenticated_session()
        
        response = session.get(f"{BASE_URL}/api/goals", params={
            "entity_id": entity_id,
            "status": "active"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"Found {len(response.json())} active goals")
    
    def test_get_debts_for_budget(self):
        """Test GET /api/debts - Used for linked debts in budget"""
        session, entity_id = get_authenticated_session()
        
        response = session.get(f"{BASE_URL}/api/debts", params={
            "entity_id": entity_id
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"Found {len(response.json())} debts")
    
    def test_get_bills_for_budget(self):
        """Test GET /api/bills - Used for linked bills in budget"""
        session, entity_id = get_authenticated_session()
        
        response = session.get(f"{BASE_URL}/api/bills", params={
            "entity_id": entity_id
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"Found {len(response.json())} bills")
    
    def test_get_accounts_for_available_funds(self):
        """Test GET /api/accounts - Used for Available Funds calculation"""
        session, entity_id = get_authenticated_session()
        
        response = session.get(f"{BASE_URL}/api/accounts", params={
            "entity_id": entity_id
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        accounts = response.json()
        total_balance = sum(float(acc.get("balance", 0)) for acc in accounts)
        print(f"Found {len(accounts)} accounts with total balance: ${total_balance}")
    
    def test_get_transactions_for_spending(self):
        """Test GET /api/transactions - Used for spending calculations"""
        session, entity_id = get_authenticated_session()
        
        response = session.get(f"{BASE_URL}/api/transactions", params={
            "entity_id": entity_id,
            "limit": 500
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        transactions = response.json()
        print(f"Found {len(transactions)} transactions")
    
    def test_get_categories_for_budget(self):
        """Test GET /api/categories - Used for category budgets"""
        session, entity_id = get_authenticated_session()
        
        response = session.get(f"{BASE_URL}/api/categories", params={
            "entity_id": entity_id
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        categories = response.json()
        expense_categories = [c for c in categories if c.get("type") in ["expense", "both"]]
        print(f"Found {len(categories)} categories, {len(expense_categories)} expense categories")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
