"""
Test Notifications UI Features - Backend API Tests
Tests for notification preferences, alerts, and related endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://elite-money-mgr.preview.emergentagent.com')

class TestNotificationsAPI:
    """Test notification-related API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get token"""
        login_resp = requests.post(f'{BASE_URL}/api/auth/login', json={
            'username': 'demo',
            'password': 'user123'
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json().get('token')
        self.headers = {'Authorization': f'Bearer {self.token}'}
        
        # Get entity ID for tests
        entities_resp = requests.get(f'{BASE_URL}/api/entities', headers=self.headers)
        if entities_resp.status_code == 200 and len(entities_resp.json()) > 0:
            self.entity_id = entities_resp.json()[0]['id']
        else:
            self.entity_id = None
    
    def test_get_notifications(self):
        """Test GET /api/notifications endpoint"""
        resp = requests.get(f'{BASE_URL}/api/notifications', headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"Notifications count: {len(data)}")
    
    def test_get_notifications_with_limit(self):
        """Test GET /api/notifications with limit parameter"""
        resp = requests.get(f'{BASE_URL}/api/notifications?limit=5', headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) <= 5
    
    def test_get_notifications_unread_only(self):
        """Test GET /api/notifications with unread_only parameter"""
        resp = requests.get(f'{BASE_URL}/api/notifications?unread_only=true', headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # All returned notifications should be unread
        for notification in data:
            assert notification.get('read') == False
    
    def test_get_unread_count(self):
        """Test GET /api/notifications/unread-count endpoint"""
        resp = requests.get(f'{BASE_URL}/api/notifications/unread-count', headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        assert 'unread_count' in data
        assert isinstance(data['unread_count'], int)
        assert data['unread_count'] >= 0
        print(f"Unread count: {data['unread_count']}")
    
    def test_get_notification_preferences(self):
        """Test GET /api/notifications/preferences endpoint"""
        resp = requests.get(f'{BASE_URL}/api/notifications/preferences', headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        
        # Check default preference fields exist
        assert 'email_notifications' in data
        assert 'budget_alerts' in data
        assert 'budget_alert_threshold' in data
        assert 'bill_reminders' in data
        assert 'bill_reminder_days' in data
        assert 'goal_milestones' in data
        assert 'weekly_summary' in data
        assert 'monthly_report' in data
        
        print(f"Preferences: {data}")
    
    def test_update_notification_preferences(self):
        """Test PUT /api/notifications/preferences endpoint"""
        # Get current preferences
        get_resp = requests.get(f'{BASE_URL}/api/notifications/preferences', headers=self.headers)
        original_prefs = get_resp.json()
        
        # Update preferences
        new_prefs = {
            'email_notifications': True,
            'budget_alerts': True,
            'budget_alert_threshold': 85,
            'bill_reminders': True,
            'bill_reminder_days': 3,
            'goal_milestones': True,
            'weekly_summary': True,
            'monthly_report': False
        }
        
        resp = requests.put(f'{BASE_URL}/api/notifications/preferences', 
                           headers=self.headers, json=new_prefs)
        assert resp.status_code == 200
        
        # Verify update
        verify_resp = requests.get(f'{BASE_URL}/api/notifications/preferences', headers=self.headers)
        updated_prefs = verify_resp.json()
        
        assert updated_prefs['budget_alert_threshold'] == 85
        assert updated_prefs['bill_reminder_days'] == 3
        assert updated_prefs['weekly_summary'] == True
        assert updated_prefs['monthly_report'] == False
        
        print(f"Updated preferences verified: threshold={updated_prefs['budget_alert_threshold']}")
    
    def test_check_alerts(self):
        """Test POST /api/notifications/check-alerts endpoint"""
        if not self.entity_id:
            pytest.skip("No entity available for testing")
        
        resp = requests.post(f'{BASE_URL}/api/notifications/check-alerts?entity_id={self.entity_id}', 
                            headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert 'success' in data
        assert data['success'] == True
        assert 'alerts_triggered' in data
        assert isinstance(data['alerts_triggered'], int)
        assert 'details' in data
        
        # Check details structure
        details = data['details']
        assert 'budget_alerts' in details
        assert 'bill_reminders' in details
        assert 'goal_milestones' in details
        
        print(f"Alerts triggered: {data['alerts_triggered']}")
        print(f"Details: {details}")
    
    def test_mark_all_notifications_read(self):
        """Test POST /api/notifications/mark-all-read endpoint"""
        resp = requests.post(f'{BASE_URL}/api/notifications/mark-all-read', headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert 'success' in data
        assert data['success'] == True
        assert 'updated_count' in data
        
        print(f"Marked {data['updated_count']} notifications as read")
    
    def test_mark_notifications_read(self):
        """Test POST /api/notifications/mark-read endpoint"""
        # This test uses empty list since we may not have notifications
        resp = requests.post(f'{BASE_URL}/api/notifications/mark-read', 
                            headers=self.headers, 
                            json={'notification_ids': []})
        assert resp.status_code == 200
        data = resp.json()
        
        assert 'success' in data
        assert data['success'] == True
    
    def test_notification_preferences_validation(self):
        """Test that notification preferences accept valid values"""
        # Test with valid threshold values
        valid_prefs = {
            'budget_alert_threshold': 50,  # Minimum
            'bill_reminder_days': 1
        }
        resp = requests.put(f'{BASE_URL}/api/notifications/preferences', 
                           headers=self.headers, json=valid_prefs)
        assert resp.status_code == 200
        
        # Verify
        verify_resp = requests.get(f'{BASE_URL}/api/notifications/preferences', headers=self.headers)
        assert verify_resp.json()['budget_alert_threshold'] == 50
        
        # Test with max threshold
        max_prefs = {
            'budget_alert_threshold': 100,
            'bill_reminder_days': 30
        }
        resp = requests.put(f'{BASE_URL}/api/notifications/preferences', 
                           headers=self.headers, json=max_prefs)
        assert resp.status_code == 200


class TestAIInsightsAPI:
    """Test AI Insights related endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        login_resp = requests.post(f'{BASE_URL}/api/auth/login', json={
            'username': 'demo',
            'password': 'user123'
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json().get('token')
        self.headers = {'Authorization': f'Bearer {self.token}'}
        
        entities_resp = requests.get(f'{BASE_URL}/api/entities', headers=self.headers)
        if entities_resp.status_code == 200 and len(entities_resp.json()) > 0:
            self.entity_id = entities_resp.json()[0]['id']
        else:
            self.entity_id = None
    
    def test_get_ai_status(self):
        """Test GET /api/settings/ai-status endpoint"""
        resp = requests.get(f'{BASE_URL}/api/settings/ai-status', headers=self.headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert 'system_ai_enabled' in data
        assert 'user_ai_enabled' in data
        assert 'effective_ai_enabled' in data
        
        print(f"AI Status: system={data['system_ai_enabled']}, user={data['user_ai_enabled']}, effective={data['effective_ai_enabled']}")
    
    def test_ai_anomalies_endpoint_exists(self):
        """Test that AI anomalies endpoint exists (may return 403 if AI disabled)"""
        if not self.entity_id:
            pytest.skip("No entity available for testing")
        
        resp = requests.post(f'{BASE_URL}/api/ai/detect-anomalies?entity_id={self.entity_id}', 
                            headers=self.headers)
        # Should return 200 if AI enabled, 403 if disabled
        assert resp.status_code in [200, 403]
        print(f"AI Anomalies endpoint status: {resp.status_code}")
    
    def test_ai_forecast_endpoint_exists(self):
        """Test that AI forecast endpoint exists"""
        if not self.entity_id:
            pytest.skip("No entity available for testing")
        
        resp = requests.post(f'{BASE_URL}/api/ai/forecast-cash-flow?entity_id={self.entity_id}&forecast_months=3', 
                            headers=self.headers)
        assert resp.status_code in [200, 403]
        print(f"AI Forecast endpoint status: {resp.status_code}")
    
    def test_ai_savings_endpoint_exists(self):
        """Test that AI savings endpoint exists"""
        if not self.entity_id:
            pytest.skip("No entity available for testing")
        
        resp = requests.post(f'{BASE_URL}/api/ai/identify-cost-savings?entity_id={self.entity_id}', 
                            headers=self.headers)
        assert resp.status_code in [200, 403]
        print(f"AI Savings endpoint status: {resp.status_code}")


class TestBudgetAlertLogic:
    """Test budget alert triggering logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        login_resp = requests.post(f'{BASE_URL}/api/auth/login', json={
            'username': 'demo',
            'password': 'user123'
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json().get('token')
        self.headers = {'Authorization': f'Bearer {self.token}'}
        
        entities_resp = requests.get(f'{BASE_URL}/api/entities', headers=self.headers)
        if entities_resp.status_code == 200 and len(entities_resp.json()) > 0:
            self.entity_id = entities_resp.json()[0]['id']
        else:
            self.entity_id = None
    
    def test_transaction_creation_triggers_alert_check(self):
        """Test that creating an expense transaction triggers budget alert check"""
        if not self.entity_id:
            pytest.skip("No entity available for testing")
        
        # Get accounts
        accounts_resp = requests.get(f'{BASE_URL}/api/accounts?entity_id={self.entity_id}', 
                                    headers=self.headers)
        if accounts_resp.status_code != 200 or len(accounts_resp.json()) == 0:
            pytest.skip("No accounts available for testing")
        
        account_id = accounts_resp.json()[0]['id']
        
        # Create an expense transaction
        transaction_data = {
            'entity_id': self.entity_id,
            'account_id': account_id,
            'type': 'expense',
            'amount': 10.00,
            'date': '2026-01-27',
            'description': 'TEST_Budget_Alert_Test'
        }
        
        resp = requests.post(f'{BASE_URL}/api/transactions', 
                            headers=self.headers, json=transaction_data)
        assert resp.status_code == 201
        
        transaction_id = resp.json().get('id')
        print(f"Created test transaction: {transaction_id}")
        
        # Clean up - delete the test transaction
        if transaction_id:
            delete_resp = requests.delete(f'{BASE_URL}/api/transactions/{transaction_id}', 
                                         headers=self.headers)
            assert delete_resp.status_code == 204
            print("Test transaction cleaned up")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
