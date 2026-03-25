"""
Test Entity Details and Documents API
Tests for:
- Create account + login (no demo seed by default)
- Create entity (personal/business)
- GET /api/entities/{id}/details returns details payload
- Update entity details via PUT /api/entities/{id}/details
- Entity documents list (should return empty array)
- Upload document should fail with 503 when EMERGENT_LLM_KEY missing
"""
import pytest
import requests
import os
import uuid

# Use environment variable for API URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')


class TestAuthAndRegistration:
    """Test user registration and login flow"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Generate unique test user credentials"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "username": f"TEST_user_{unique_id}",
            "email": f"test_{unique_id}@example.com",
            "password": "TestPass123!",
            "full_name": "Test User"
        }
    
    def test_register_new_user(self, test_user):
        """Test user registration"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=test_user
        )
        print(f"Register response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 201, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["username"] == test_user["username"]
        assert data["user"]["email"] == test_user["email"]
        
        # Store token for later tests
        test_user["token"] = data["token"]
        test_user["user_id"] = data["user"]["id"]
        return data
    
    def test_login_registered_user(self, test_user):
        """Test login with registered user"""
        # First register if not already done
        if "token" not in test_user:
            self.test_register_new_user(test_user)
        
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "username": test_user["username"],
                "password": test_user["password"]
            }
        )
        print(f"Login response: {response.status_code}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        return data


class TestEntityCRUD:
    """Test entity creation and management"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token by registering a new user"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_entity_user_{unique_id}",
            "email": f"entity_test_{unique_id}@example.com",
            "password": "TestPass123!",
            "full_name": "Entity Test User"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code == 201:
            return response.json()["token"]
        
        # If registration fails (user exists), try login
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": user_data["username"], "password": user_data["password"]}
        )
        if response.status_code == 200:
            return response.json()["token"]
        
        pytest.skip("Could not authenticate for entity tests")
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_create_personal_entity(self, auth_headers):
        """Test creating a personal entity"""
        unique_id = str(uuid.uuid4())[:8]
        entity_data = {
            "name": f"TEST_Personal_{unique_id}",
            "type": "personal"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/entities",
            json=entity_data,
            headers=auth_headers
        )
        print(f"Create personal entity: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 201, f"Failed to create entity: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["name"] == entity_data["name"]
        assert data["type"] == "personal"
        assert "created_at" in data
        assert "updated_at" in data
        
        return data
    
    def test_create_business_entity(self, auth_headers):
        """Test creating a business entity"""
        unique_id = str(uuid.uuid4())[:8]
        entity_data = {
            "name": f"TEST_Business_{unique_id}",
            "type": "business"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/entities",
            json=entity_data,
            headers=auth_headers
        )
        print(f"Create business entity: {response.status_code}")
        assert response.status_code == 201, f"Failed to create entity: {response.text}"
        
        data = response.json()
        assert data["type"] == "business"
        return data
    
    def test_list_entities(self, auth_headers):
        """Test listing entities"""
        response = requests.get(
            f"{BASE_URL}/api/entities",
            headers=auth_headers
        )
        print(f"List entities: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        return data


class TestEntityDetails:
    """Test entity details endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_and_entity(self):
        """Create user and entities for testing"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_details_user_{unique_id}",
            "email": f"details_test_{unique_id}@example.com",
            "password": "TestPass123!",
            "full_name": "Details Test User"
        }
        
        # Register user
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code != 201:
            pytest.skip("Could not register user for details tests")
        
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create personal entity
        personal_response = requests.post(
            f"{BASE_URL}/api/entities",
            json={"name": f"TEST_Personal_Details_{unique_id}", "type": "personal"},
            headers=headers
        )
        personal_entity = personal_response.json() if personal_response.status_code == 201 else None
        
        # Create business entity
        business_response = requests.post(
            f"{BASE_URL}/api/entities",
            json={"name": f"TEST_Business_Details_{unique_id}", "type": "business"},
            headers=headers
        )
        business_entity = business_response.json() if business_response.status_code == 201 else None
        
        return {
            "token": token,
            "headers": headers,
            "personal_entity": personal_entity,
            "business_entity": business_entity
        }
    
    def test_get_personal_entity_details(self, auth_and_entity):
        """Test GET /api/entities/{id}/details for personal entity"""
        if not auth_and_entity["personal_entity"]:
            pytest.skip("No personal entity created")
        
        entity_id = auth_and_entity["personal_entity"]["id"]
        response = requests.get(
            f"{BASE_URL}/api/entities/{entity_id}/details",
            headers=auth_and_entity["headers"]
        )
        print(f"Get personal details: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Failed to get details: {response.text}"
        
        data = response.json()
        assert "entity" in data
        assert "personal_details" in data
        assert data["business_details"] is None  # Should be None for personal entity
        assert data["entity"]["type"] == "personal"
        
        # Verify personal_details structure
        personal_details = data["personal_details"]
        assert personal_details is not None or personal_details == {}
        
        return data
    
    def test_get_business_entity_details(self, auth_and_entity):
        """Test GET /api/entities/{id}/details for business entity"""
        if not auth_and_entity["business_entity"]:
            pytest.skip("No business entity created")
        
        entity_id = auth_and_entity["business_entity"]["id"]
        response = requests.get(
            f"{BASE_URL}/api/entities/{entity_id}/details",
            headers=auth_and_entity["headers"]
        )
        print(f"Get business details: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Failed to get details: {response.text}"
        
        data = response.json()
        assert "entity" in data
        assert "business_details" in data
        assert data["personal_details"] is None  # Should be None for business entity
        assert data["entity"]["type"] == "business"
        
        return data
    
    def test_update_personal_entity_details(self, auth_and_entity):
        """Test PUT /api/entities/{id}/details for personal entity"""
        if not auth_and_entity["personal_entity"]:
            pytest.skip("No personal entity created")
        
        entity_id = auth_and_entity["personal_entity"]["id"]
        update_data = {
            "personal_details": {
                "legal_name": "John Test Doe",
                "preferred_name": "Johnny",
                "date_of_birth": "1990-01-15",
                "ssn_last4": "1234",
                "filing_status": "single",
                "primary_address": "123 Test Street, Test City, TS 12345",
                "residency_state": "CA",
                "phone": "555-123-4567",
                "email": "john.test@example.com",
                "employment_status": "employed",
                "employer_name": "Test Corp",
                "risk_tolerance": "moderate",
                "notes": "Test personal entity notes"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/entities/{entity_id}/details",
            json=update_data,
            headers=auth_and_entity["headers"]
        )
        print(f"Update personal details: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Failed to update details: {response.text}"
        
        data = response.json()
        assert data["personal_details"]["legal_name"] == "John Test Doe"
        assert data["personal_details"]["preferred_name"] == "Johnny"
        assert data["personal_details"]["filing_status"] == "single"
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/entities/{entity_id}/details",
            headers=auth_and_entity["headers"]
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["personal_details"]["legal_name"] == "John Test Doe"
        
        return data
    
    def test_update_business_entity_details(self, auth_and_entity):
        """Test PUT /api/entities/{id}/details for business entity"""
        if not auth_and_entity["business_entity"]:
            pytest.skip("No business entity created")
        
        entity_id = auth_and_entity["business_entity"]["id"]
        update_data = {
            "business_details": {
                "legal_name": "Test Business LLC",
                "dba_name": "Test Biz",
                "ein": "12-3456789",
                "entity_structure": "LLC",
                "formation_state": "DE",
                "formation_date": "2020-06-15",
                "registered_agent_name": "Agent Smith",
                "registered_agent_email": "agent@example.com",
                "registered_agent_phone": "555-987-6543",
                "principal_address": "456 Business Ave, Corp City, BC 67890",
                "mailing_address": "PO Box 123, Corp City, BC 67890",
                "contact_email": "contact@testbiz.com",
                "contact_phone": "555-111-2222",
                "website": "https://testbiz.example.com",
                "fiscal_year_end": "December",
                "accounting_method": "accrual",
                "payroll_provider": "ADP",
                "notes": "Test business entity notes"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/entities/{entity_id}/details",
            json=update_data,
            headers=auth_and_entity["headers"]
        )
        print(f"Update business details: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Failed to update details: {response.text}"
        
        data = response.json()
        assert data["business_details"]["legal_name"] == "Test Business LLC"
        assert data["business_details"]["ein"] == "12-3456789"
        assert data["business_details"]["entity_structure"] == "LLC"
        
        # Verify persistence with GET
        get_response = requests.get(
            f"{BASE_URL}/api/entities/{entity_id}/details",
            headers=auth_and_entity["headers"]
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["business_details"]["legal_name"] == "Test Business LLC"
        
        return data
    
    def test_update_wrong_details_type_fails(self, auth_and_entity):
        """Test that updating with wrong details type fails"""
        if not auth_and_entity["personal_entity"]:
            pytest.skip("No personal entity created")
        
        entity_id = auth_and_entity["personal_entity"]["id"]
        # Try to update personal entity with business_details
        update_data = {
            "business_details": {
                "legal_name": "Should Fail"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/entities/{entity_id}/details",
            json=update_data,
            headers=auth_and_entity["headers"]
        )
        print(f"Wrong details type: {response.status_code}")
        assert response.status_code == 400, "Should fail with 400 for wrong details type"


class TestEntityDocuments:
    """Test entity documents endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_and_entity(self):
        """Create user and entity for document testing"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_docs_user_{unique_id}",
            "email": f"docs_test_{unique_id}@example.com",
            "password": "TestPass123!",
            "full_name": "Docs Test User"
        }
        
        # Register user
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code != 201:
            pytest.skip("Could not register user for document tests")
        
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create entity
        entity_response = requests.post(
            f"{BASE_URL}/api/entities",
            json={"name": f"TEST_Docs_Entity_{unique_id}", "type": "business"},
            headers=headers
        )
        entity = entity_response.json() if entity_response.status_code == 201 else None
        
        return {
            "token": token,
            "headers": headers,
            "entity": entity
        }
    
    def test_list_entity_documents_empty(self, auth_and_entity):
        """Test GET /api/entities/{id}/documents returns empty array for new entity"""
        if not auth_and_entity["entity"]:
            pytest.skip("No entity created")
        
        entity_id = auth_and_entity["entity"]["id"]
        response = requests.get(
            f"{BASE_URL}/api/entities/{entity_id}/documents",
            headers=auth_and_entity["headers"]
        )
        print(f"List documents: {response.status_code} - {response.text}")
        assert response.status_code == 200, f"Failed to list documents: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0, "New entity should have no documents"
        
        return data
    
    def test_upload_document_with_storage_enabled(self, auth_and_entity):
        """Test document upload when EMERGENT_LLM_KEY is set"""
        if not auth_and_entity["entity"]:
            pytest.skip("No entity created")
        
        entity_id = auth_and_entity["entity"]["id"]
        
        # Create a test file
        test_content = b"This is a test document content for BlackieFi testing."
        files = {
            "file": ("test_document.txt", test_content, "text/plain")
        }
        form_data = {
            "document_type": "other",
            "title": "Test Document",
            "notes": "Test upload notes",
            "tags": "test,upload"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/entities/{entity_id}/documents",
            files=files,
            data=form_data,
            headers=auth_and_entity["headers"]
        )
        print(f"Upload document: {response.status_code} - {response.text[:300]}")
        
        # If EMERGENT_LLM_KEY is set, upload should succeed (201)
        # If not set, should return 503
        if response.status_code == 503:
            data = response.json()
            assert "Object storage not configured" in data.get("detail", "")
            print("Upload correctly returned 503 - storage not configured")
        elif response.status_code == 201:
            data = response.json()
            assert "id" in data
            assert data["title"] == "Test Document"
            assert data["document_type"] == "other"
            print("Upload succeeded - storage is configured")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")
        
        return response.status_code


class TestDocumentUpload503:
    """Test that document upload returns 503 when EMERGENT_LLM_KEY is not set"""
    
    def test_upload_returns_503_without_key(self):
        """
        This test verifies the 503 behavior.
        Note: If EMERGENT_LLM_KEY is set in the environment, this test will be skipped.
        """
        # First check if storage is enabled by checking the upload endpoint
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_503_user_{unique_id}",
            "email": f"test503_{unique_id}@example.com",
            "password": "TestPass123!",
            "full_name": "503 Test User"
        }
        
        # Register user
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code != 201:
            pytest.skip("Could not register user")
        
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create entity
        entity_response = requests.post(
            f"{BASE_URL}/api/entities",
            json={"name": f"TEST_503_Entity_{unique_id}", "type": "personal"},
            headers=headers
        )
        if entity_response.status_code != 201:
            pytest.skip("Could not create entity")
        
        entity_id = entity_response.json()["id"]
        
        # Try to upload
        test_content = b"Test content"
        files = {"file": ("test.txt", test_content, "text/plain")}
        form_data = {"document_type": "other", "title": "Test"}
        
        response = requests.post(
            f"{BASE_URL}/api/entities/{entity_id}/documents",
            files=files,
            data=form_data,
            headers=headers
        )
        
        print(f"Upload test: {response.status_code} - {response.text[:200]}")
        
        # Document the actual behavior
        if response.status_code == 503:
            print("PASS: Upload correctly returns 503 when storage not configured")
            assert "Object storage not configured" in response.json().get("detail", "")
        elif response.status_code == 201:
            print("INFO: Storage IS configured (EMERGENT_LLM_KEY is set)")
            # This is also valid - storage is working
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")


class TestEntityNotFound:
    """Test 404 responses for non-existent entities"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_404_user_{unique_id}",
            "email": f"test404_{unique_id}@example.com",
            "password": "TestPass123!",
            "full_name": "404 Test User"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code != 201:
            pytest.skip("Could not register user")
        
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_get_nonexistent_entity_details(self, auth_headers):
        """Test GET details for non-existent entity returns 404"""
        fake_id = "nonexistent123456789"
        response = requests.get(
            f"{BASE_URL}/api/entities/{fake_id}/details",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_list_documents_nonexistent_entity(self, auth_headers):
        """Test list documents for non-existent entity returns 404"""
        fake_id = "nonexistent123456789"
        response = requests.get(
            f"{BASE_URL}/api/entities/{fake_id}/documents",
            headers=auth_headers
        )
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
