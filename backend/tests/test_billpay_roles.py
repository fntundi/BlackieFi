"""
Test Bill Pay Scheduling and Roles APIs for BlackieFi 3.0
Tests: CRUD for bill schedules, pay-now, toggle, process-due, history
Tests: Roles CRUD, permissions update, custom role creation/deletion
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@blackiefi.com"
TEST_PASSWORD = "Demo123!"


class TestBillPayScheduling:
    """Bill Pay Scheduling API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token + entity_id"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        data = login_resp.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get entity_id
        entities_resp = requests.get(f"{BASE_URL}/api/entities/", headers=self.headers)
        assert entities_resp.status_code == 200
        entities = entities_resp.json()
        assert len(entities) > 0, "No entities found"
        self.entity_id = entities[0]["id"]
    
    def test_list_schedules(self):
        """GET /api/billpay/schedules - list all schedules"""
        resp = requests.get(
            f"{BASE_URL}/api/billpay/schedules",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert "schedules" in data
        assert isinstance(data["schedules"], list)
        print(f"✓ List schedules: {len(data['schedules'])} schedules found")
    
    def test_create_schedule(self):
        """POST /api/billpay/schedules - create new schedule"""
        payload = {
            "name": "TEST_Internet Bill",
            "amount": 79.99,
            "frequency": "monthly",
            "day_of_month": 15,
            "source_type": "expense",
            "enabled": True
        }
        resp = requests.post(
            f"{BASE_URL}/api/billpay/schedules",
            params={"entity_id": self.entity_id},
            headers=self.headers,
            json=payload
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data["name"] == "TEST_Internet Bill"
        assert data["amount"] == 79.99
        assert data["frequency"] == "monthly"
        assert data["day_of_month"] == 15
        assert data["enabled"] == True
        assert "id" in data
        assert "next_payment_date" in data
        print(f"✓ Created schedule: {data['id']}")
        
        # Store for cleanup
        self.created_schedule_id = data["id"]
        return data["id"]
    
    def test_update_schedule(self):
        """PUT /api/billpay/schedules/{id} - update schedule"""
        # First create a schedule
        create_payload = {
            "name": "TEST_Update Bill",
            "amount": 50.00,
            "frequency": "monthly",
            "day_of_month": 10,
            "source_type": "expense",
            "enabled": True
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/billpay/schedules",
            params={"entity_id": self.entity_id},
            headers=self.headers,
            json=create_payload
        )
        assert create_resp.status_code == 200
        schedule_id = create_resp.json()["id"]
        
        # Update it
        update_payload = {
            "name": "TEST_Updated Bill Name",
            "amount": 75.00,
            "frequency": "monthly",
            "day_of_month": 20,
            "source_type": "expense",
            "enabled": False
        }
        resp = requests.put(
            f"{BASE_URL}/api/billpay/schedules/{schedule_id}",
            params={"entity_id": self.entity_id},
            headers=self.headers,
            json=update_payload
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data["message"] == "Schedule updated"
        print(f"✓ Updated schedule: {schedule_id}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/billpay/schedules/{schedule_id}",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
    
    def test_toggle_schedule(self):
        """POST /api/billpay/schedules/{id}/toggle - toggle enable/disable"""
        # Create a schedule
        create_payload = {
            "name": "TEST_Toggle Bill",
            "amount": 30.00,
            "frequency": "monthly",
            "day_of_month": 5,
            "source_type": "expense",
            "enabled": True
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/billpay/schedules",
            params={"entity_id": self.entity_id},
            headers=self.headers,
            json=create_payload
        )
        assert create_resp.status_code == 200
        schedule_id = create_resp.json()["id"]
        
        # Toggle off
        resp = requests.post(
            f"{BASE_URL}/api/billpay/schedules/{schedule_id}/toggle",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data["enabled"] == False
        print(f"✓ Toggled schedule off: {schedule_id}")
        
        # Toggle back on
        resp2 = requests.post(
            f"{BASE_URL}/api/billpay/schedules/{schedule_id}/toggle",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["enabled"] == True
        print(f"✓ Toggled schedule on: {schedule_id}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/billpay/schedules/{schedule_id}",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
    
    def test_pay_now(self):
        """POST /api/billpay/schedules/{id}/pay-now - execute immediate payment"""
        # Create a schedule
        create_payload = {
            "name": "TEST_PayNow Bill",
            "amount": 25.00,
            "frequency": "monthly",
            "day_of_month": 1,
            "source_type": "expense",
            "enabled": True
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/billpay/schedules",
            params={"entity_id": self.entity_id},
            headers=self.headers,
            json=create_payload
        )
        assert create_resp.status_code == 200
        schedule_id = create_resp.json()["id"]
        
        # Pay now
        resp = requests.post(
            f"{BASE_URL}/api/billpay/schedules/{schedule_id}/pay-now",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert "message" in data
        assert "transaction_id" in data
        assert "next_payment_date" in data
        assert "25.00" in data["message"]
        print(f"✓ Pay now executed: {data['transaction_id']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/billpay/schedules/{schedule_id}",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
    
    def test_process_due(self):
        """POST /api/billpay/process-due - process all due schedules"""
        resp = requests.post(
            f"{BASE_URL}/api/billpay/process-due",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert "processed" in data
        assert "total_processed" in data
        assert "message" in data
        print(f"✓ Process due: {data['total_processed']} processed")
    
    def test_get_history(self):
        """GET /api/billpay/history - get payment history"""
        resp = requests.get(
            f"{BASE_URL}/api/billpay/history",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert "history" in data
        assert "total" in data
        assert isinstance(data["history"], list)
        print(f"✓ History: {data['total']} transactions")
    
    def test_delete_schedule(self):
        """DELETE /api/billpay/schedules/{id} - delete schedule"""
        # Create a schedule to delete
        create_payload = {
            "name": "TEST_Delete Bill",
            "amount": 10.00,
            "frequency": "monthly",
            "day_of_month": 1,
            "source_type": "expense",
            "enabled": True
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/billpay/schedules",
            params={"entity_id": self.entity_id},
            headers=self.headers,
            json=create_payload
        )
        assert create_resp.status_code == 200
        schedule_id = create_resp.json()["id"]
        
        # Delete it
        resp = requests.delete(
            f"{BASE_URL}/api/billpay/schedules/{schedule_id}",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data["message"] == "Schedule deleted"
        print(f"✓ Deleted schedule: {schedule_id}")
        
        # Verify deletion
        list_resp = requests.get(
            f"{BASE_URL}/api/billpay/schedules",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
        schedules = list_resp.json()["schedules"]
        assert not any(s["id"] == schedule_id for s in schedules)


class TestRolesAPI:
    """Roles API Tests - CRUD and permissions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token + entity_id"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        data = login_resp.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get entity_id
        entities_resp = requests.get(f"{BASE_URL}/api/entities/", headers=self.headers)
        assert entities_resp.status_code == 200
        entities = entities_resp.json()
        self.entity_id = entities[0]["id"]
    
    def test_list_roles(self):
        """GET /api/roles/ - list all roles"""
        resp = requests.get(
            f"{BASE_URL}/api/roles/",
            headers=self.headers
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 3  # admin, power_user, regular_user at minimum
        
        # Check default roles exist
        role_names = [r["name"] for r in data]
        assert "admin" in role_names
        assert "power_user" in role_names
        assert "regular_user" in role_names
        print(f"✓ List roles: {len(data)} roles found")
    
    def test_create_custom_role(self):
        """POST /api/roles/ - create new custom role"""
        payload = {
            "name": "test_custom_role",
            "display_name": "Test Custom Role",
            "permissions": {
                "view_transactions": True,
                "create_transaction": False,
                "view_budgets": True,
                "manage_budgets": False
            }
        }
        resp = requests.post(
            f"{BASE_URL}/api/roles/",
            params={"entity_id": self.entity_id},
            headers=self.headers,
            json=payload
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data["name"] == "test_custom_role"
        assert data["display_name"] == "Test Custom Role"
        assert data["is_default"] == False
        assert "id" in data
        print(f"✓ Created custom role: {data['id']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/roles/{data['id']}",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
    
    def test_update_role_permissions(self):
        """PUT /api/roles/{id}/permissions - update permissions"""
        # First get roles to find a non-default one or create one
        list_resp = requests.get(f"{BASE_URL}/api/roles/", headers=self.headers)
        roles = list_resp.json()
        
        # Create a custom role for testing
        create_payload = {
            "name": "test_perm_role",
            "display_name": "Test Perm Role",
            "permissions": {"view_transactions": False}
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/roles/",
            params={"entity_id": self.entity_id},
            headers=self.headers,
            json=create_payload
        )
        assert create_resp.status_code == 200
        role_id = create_resp.json()["id"]
        
        # Update permissions
        new_perms = {
            "view_transactions": True,
            "create_transaction": True,
            "edit_transaction": False,
            "delete_transaction": False,
            "view_budgets": True,
            "manage_budgets": False
        }
        resp = requests.put(
            f"{BASE_URL}/api/roles/{role_id}/permissions",
            params={"entity_id": self.entity_id},
            headers=self.headers,
            json=new_perms
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data["message"] == "Permissions updated"
        print(f"✓ Updated permissions for role: {role_id}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/roles/{role_id}",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
    
    def test_delete_custom_role(self):
        """DELETE /api/roles/{id} - delete custom role"""
        # Create a role to delete
        create_payload = {
            "name": "test_delete_role",
            "display_name": "Test Delete Role",
            "permissions": {}
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/roles/",
            params={"entity_id": self.entity_id},
            headers=self.headers,
            json=create_payload
        )
        assert create_resp.status_code == 200
        role_id = create_resp.json()["id"]
        
        # Delete it
        resp = requests.delete(
            f"{BASE_URL}/api/roles/{role_id}",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        assert data["message"] == "Role deleted"
        print(f"✓ Deleted custom role: {role_id}")
    
    def test_cannot_delete_default_role(self):
        """DELETE /api/roles/{id} - cannot delete default roles"""
        # Get admin role
        list_resp = requests.get(f"{BASE_URL}/api/roles/", headers=self.headers)
        roles = list_resp.json()
        admin_role = next((r for r in roles if r["name"] == "admin"), None)
        assert admin_role is not None
        
        # Try to delete it
        resp = requests.delete(
            f"{BASE_URL}/api/roles/{admin_role['id']}",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
        assert resp.status_code == 400, f"Should fail: {resp.text}"
        print("✓ Cannot delete default role (expected 400)")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        data = login_resp.json()
        self.token = data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        entities_resp = requests.get(f"{BASE_URL}/api/entities/", headers=self.headers)
        self.entity_id = entities_resp.json()[0]["id"]
    
    def test_cleanup_test_schedules(self):
        """Clean up TEST_ prefixed schedules"""
        resp = requests.get(
            f"{BASE_URL}/api/billpay/schedules",
            params={"entity_id": self.entity_id},
            headers=self.headers
        )
        if resp.status_code == 200:
            schedules = resp.json().get("schedules", [])
            for s in schedules:
                if s["name"].startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/billpay/schedules/{s['id']}",
                        params={"entity_id": self.entity_id},
                        headers=self.headers
                    )
                    print(f"Cleaned up schedule: {s['name']}")
        print("✓ Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
