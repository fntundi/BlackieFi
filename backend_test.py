#!/usr/bin/env python3
"""
BlackieFi Backend API Test Suite
Tests the Go + PostgreSQL backend API endpoints
"""

import requests
import json
import sys
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
API_BASE_URL = "http://localhost:8080/api"
TEST_USER_DATA = {
    "username": f"testuser_{int(time.time())}",
    "email": f"test_{int(time.time())}@blackiefi.com",
    "password": "TestPassword123!",
    "full_name": "Test User"
}

class BlackieFiAPITester:
    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.entity_id: Optional[str] = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        
    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def make_request(self, method: str, endpoint: str, data: Dict[Any, Any] = None, 
                    expected_status: int = 200, auth_required: bool = True) -> tuple[bool, Dict[Any, Any]]:
        """Make HTTP request and validate response"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth_required and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
            
        self.tests_run += 1
        
        try:
            if method == "GET":
                response = self.session.get(url, headers=headers)
            elif method == "POST":
                response = self.session.post(url, json=data, headers=headers)
            elif method == "PUT":
                response = self.session.put(url, json=data, headers=headers)
            elif method == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {method} {endpoint} - Status: {response.status_code}")
            else:
                self.log(f"❌ {method} {endpoint} - Expected: {expected_status}, Got: {response.status_code}", "ERROR")
                if response.text:
                    self.log(f"   Response: {response.text[:200]}", "ERROR")
                    
            try:
                response_data = response.json() if response.text else {}
            except json.JSONDecodeError:
                response_data = {"raw_response": response.text}
                
            return success, response_data
            
        except Exception as e:
            self.log(f"❌ {method} {endpoint} - Exception: {str(e)}", "ERROR")
            return False, {"error": str(e)}
    
    def test_health_check(self) -> bool:
        """Test API health endpoint"""
        self.log("Testing health check...")
        success, data = self.make_request("GET", "/health", auth_required=False)
        if success and data.get("status") == "ok":
            self.log("✅ Health check passed")
            return True
        self.log("❌ Health check failed", "ERROR")
        return False
    
    def test_user_registration(self) -> bool:
        """Test user registration"""
        self.log("Testing user registration...")
        success, data = self.make_request("POST", "/auth/register", 
                                        TEST_USER_DATA, 201, auth_required=False)
        if success and "token" in data and "user" in data:
            self.token = data["token"]
            self.user_id = data["user"]["id"]
            self.log(f"✅ User registered successfully - ID: {self.user_id}")
            return True
        self.log("❌ User registration failed", "ERROR")
        return False
    
    def test_user_login(self) -> bool:
        """Test user login"""
        self.log("Testing user login...")
        login_data = {
            "username": TEST_USER_DATA["username"],
            "password": TEST_USER_DATA["password"]
        }
        success, data = self.make_request("POST", "/auth/login", 
                                        login_data, 200, auth_required=False)
        if success and "token" in data:
            self.token = data["token"]
            self.log("✅ User login successful")
            return True
        self.log("❌ User login failed", "ERROR")
        return False
    
    def test_get_user_profile(self) -> bool:
        """Test getting user profile"""
        self.log("Testing get user profile...")
        success, data = self.make_request("GET", "/auth/me")
        if success and data.get("username") == TEST_USER_DATA["username"]:
            self.log("✅ User profile retrieved successfully")
            return True
        self.log("❌ Get user profile failed", "ERROR")
        return False
    
    def test_create_entity(self) -> bool:
        """Test creating an entity"""
        self.log("Testing entity creation...")
        entity_data = {
            "name": "Test Personal Entity",
            "type": "personal"
        }
        success, data = self.make_request("POST", "/entities", entity_data, 201)
        if success and "id" in data:
            self.entity_id = data["id"]
            self.log(f"✅ Entity created successfully - ID: {self.entity_id}")
            return True
        self.log("❌ Entity creation failed", "ERROR")
        return False
    
    def test_get_entities(self) -> bool:
        """Test getting entities"""
        self.log("Testing get entities...")
        success, data = self.make_request("GET", "/entities")
        if success and isinstance(data, list):
            self.log(f"✅ Retrieved {len(data)} entities")
            return True
        self.log("❌ Get entities failed", "ERROR")
        return False
    
    def test_create_account(self) -> bool:
        """Test creating an account"""
        if not self.entity_id:
            self.log("❌ Cannot test account creation - no entity ID", "ERROR")
            return False
            
        self.log("Testing account creation...")
        account_data = {
            "entity_id": self.entity_id,
            "name": "Test Checking Account",
            "type": "checking",
            "balance": 1000.00,
            "currency": "USD"
        }
        success, data = self.make_request("POST", "/accounts", account_data, 201)
        if success and "id" in data:
            self.log(f"✅ Account created successfully - ID: {data['id']}")
            return True
        self.log("❌ Account creation failed", "ERROR")
        return False
    
    def test_get_accounts(self) -> bool:
        """Test getting accounts"""
        self.log("Testing get accounts...")
        success, data = self.make_request("GET", f"/accounts?entity_id={self.entity_id}")
        if success and isinstance(data, list):
            self.log(f"✅ Retrieved {len(data)} accounts")
            return True
        self.log("❌ Get accounts failed", "ERROR")
        return False
    
    def test_create_category(self) -> bool:
        """Test creating a category"""
        if not self.entity_id:
            self.log("❌ Cannot test category creation - no entity ID", "ERROR")
            return False
            
        self.log("Testing category creation...")
        category_data = {
            "entity_id": self.entity_id,
            "name": "Test Groceries",
            "type": "expense"
        }
        success, data = self.make_request("POST", "/categories", category_data, 201)
        if success and "id" in data:
            self.log(f"✅ Category created successfully - ID: {data['id']}")
            return True
        self.log("❌ Category creation failed", "ERROR")
        return False
    
    def test_get_settings(self) -> bool:
        """Test getting system settings"""
        self.log("Testing get settings...")
        success, data = self.make_request("GET", "/settings")
        if success and "settings" in data:
            self.log("✅ Settings retrieved successfully")
            return True
        self.log("❌ Get settings failed", "ERROR")
        return False
    
    def test_get_ai_status(self) -> bool:
        """Test getting AI status"""
        self.log("Testing AI status...")
        success, data = self.make_request("GET", "/settings/ai-status")
        if success and "ai_available" in data:
            ai_available = data["ai_available"]
            self.log(f"✅ AI status retrieved - Available: {ai_available}")
            return True
        self.log("❌ Get AI status failed", "ERROR")
        return False
    
    def test_password_reset_flow(self) -> bool:
        """Test password reset request"""
        self.log("Testing password reset request...")
        reset_data = {"email": TEST_USER_DATA["email"]}
        success, data = self.make_request("POST", "/auth/password-reset/request", 
                                        reset_data, 200, auth_required=False)
        if success and "message" in data:
            self.log("✅ Password reset request successful")
            return True
        self.log("❌ Password reset request failed", "ERROR")
        return False
    
    def run_comprehensive_test(self) -> bool:
        """Run all tests in sequence"""
        self.log("🚀 Starting BlackieFi Backend API Tests")
        self.log("=" * 50)
        
        # Core API tests
        tests = [
            ("Health Check", self.test_health_check),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("Get User Profile", self.test_get_user_profile),
            ("Create Entity", self.test_create_entity),
            ("Get Entities", self.test_get_entities),
            ("Create Account", self.test_create_account),
            ("Get Accounts", self.test_get_accounts),
            ("Create Category", self.test_create_category),
            ("Get Settings", self.test_get_settings),
            ("Get AI Status", self.test_get_ai_status),
            ("Password Reset Request", self.test_password_reset_flow),
        ]
        
        failed_tests = []
        
        for test_name, test_func in tests:
            self.log(f"\n--- Running: {test_name} ---")
            try:
                if not test_func():
                    failed_tests.append(test_name)
            except Exception as e:
                self.log(f"❌ {test_name} - Exception: {str(e)}", "ERROR")
                failed_tests.append(test_name)
        
        # Summary
        self.log("\n" + "=" * 50)
        self.log("📊 TEST SUMMARY")
        self.log(f"Tests Run: {self.tests_run}")
        self.log(f"Tests Passed: {self.tests_passed}")
        self.log(f"Tests Failed: {self.tests_run - self.tests_passed}")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if failed_tests:
            self.log(f"\n❌ Failed Tests: {', '.join(failed_tests)}", "ERROR")
            return False
        else:
            self.log("\n✅ All tests passed!")
            return True

def main():
    """Main test execution"""
    tester = BlackieFiAPITester()
    
    # Wait for services to be ready
    print("⏳ Waiting for backend service to be ready...")
    max_retries = 30
    for i in range(max_retries):
        try:
            response = requests.get(f"{API_BASE_URL}/health", timeout=5)
            if response.status_code == 200:
                print("✅ Backend service is ready!")
                break
        except requests.exceptions.RequestException:
            pass
        
        if i == max_retries - 1:
            print("❌ Backend service not ready after 30 attempts")
            return 1
            
        time.sleep(2)
    
    # Run tests
    success = tester.run_comprehensive_test()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())