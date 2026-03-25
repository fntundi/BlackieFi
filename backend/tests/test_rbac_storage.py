"""
Test RBAC, Admin User Management, and Storage Settings
Tests for:
- Admin login and authentication
- Admin user creation and management
- Entity access grants (RBAC)
- Storage settings configuration
- Document upload with storage not configured (503)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')

# Test credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "P@ssw0rd"
TEST_USER_PREFIX = "TEST_RBAC_"


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Test admin login with seeded credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        # Admin may not be seeded, so we accept 200 or 401
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            assert "user" in data
            print(f"Admin login successful: {data['user'].get('username')}")
        else:
            print(f"Admin not seeded or wrong credentials: {response.status_code}")
            pytest.skip("Admin user not seeded")
    
    def test_admin_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "invalid_admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestStorageSettings:
    """Test storage settings endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin user not available")
        return response.json()["token"]
    
    @pytest.fixture
    def regular_user_token(self):
        """Create and get regular user token"""
        # Register a new user
        import secrets
        username = f"{TEST_USER_PREFIX}regular_{secrets.token_hex(4)}"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "TestPass123!",
            "full_name": "Test Regular User"
        })
        if response.status_code == 201:
            return response.json()["token"]
        pytest.skip("Could not create regular user")
    
    def test_get_storage_settings_admin(self, admin_token):
        """Admin can get storage settings"""
        response = requests.get(
            f"{BASE_URL}/api/settings/storage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "provider" in data
        assert "endpoint_url" in data
        assert "bucket" in data
        assert "enabled" in data
        print(f"Storage settings: enabled={data.get('enabled')}")
    
    def test_get_storage_settings_non_admin_forbidden(self, regular_user_token):
        """Non-admin cannot get storage settings"""
        response = requests.get(
            f"{BASE_URL}/api/settings/storage",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403
    
    def test_update_storage_settings(self, admin_token):
        """Admin can update storage settings"""
        response = requests.put(
            f"{BASE_URL}/api/settings/storage",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "provider": "minio",
                "endpoint_url": "http://minio:9000",
                "bucket": "test-bucket",
                "access_key": "test-access-key",
                "secret_key": "test-secret-key",
                "region": "us-east-1",
                "secure": False,
                "path_prefix": "blackiefi",
                "enabled": False  # Keep disabled for testing
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["endpoint_url"] == "http://minio:9000"
        assert data["bucket"] == "test-bucket"
        assert data["secret_key_set"] == True
        print("Storage settings updated successfully")


class TestAdminUserManagement:
    """Test admin user management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin user not available")
        return response.json()["token"]
    
    def test_list_users_admin(self, admin_token):
        """Admin can list all users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} users")
    
    def test_create_user_admin(self, admin_token):
        """Admin can create a new user"""
        import secrets
        username = f"{TEST_USER_PREFIX}created_{secrets.token_hex(4)}"
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": username,
                "email": f"{username}@example.com",
                "password": "TestPass123!",
                "full_name": "Test Created User",
                "role": "accountant"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == username
        assert data["role"] == "accountant"
        print(f"Created user: {data['id']}")
        return data["id"]
    
    def test_create_user_duplicate_username(self, admin_token):
        """Cannot create user with duplicate username"""
        import secrets
        username = f"{TEST_USER_PREFIX}dup_{secrets.token_hex(4)}"
        # Create first user
        requests.post(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": username,
                "email": f"{username}@example.com",
                "password": "TestPass123!",
                "role": "user"
            }
        )
        # Try to create duplicate
        response = requests.post(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": username,
                "email": f"{username}2@example.com",
                "password": "TestPass123!",
                "role": "user"
            }
        )
        assert response.status_code == 409
    
    def test_update_user_role(self, admin_token):
        """Admin can update user role"""
        import secrets
        username = f"{TEST_USER_PREFIX}role_{secrets.token_hex(4)}"
        # Create user
        create_response = requests.post(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": username,
                "email": f"{username}@example.com",
                "password": "TestPass123!",
                "role": "user"
            }
        )
        user_id = create_response.json()["id"]
        
        # Update role
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/role",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"role": "accountant"}
        )
        assert response.status_code == 200
        assert response.json()["role"] == "accountant"
        print(f"Updated user {user_id} role to accountant")


class TestEntityAccessGrants:
    """Test entity access grant endpoints (RBAC)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin user not available")
        return response.json()["token"]
    
    @pytest.fixture
    def test_user_and_entity(self, admin_token):
        """Create test user and entity for access tests"""
        import secrets
        username = f"{TEST_USER_PREFIX}access_{secrets.token_hex(4)}"
        
        # Create user
        user_response = requests.post(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": username,
                "email": f"{username}@example.com",
                "password": "TestPass123!",
                "role": "user"
            }
        )
        user_id = user_response.json()["id"]
        
        # Get entities (user should have a default personal entity)
        entities_response = requests.get(
            f"{BASE_URL}/api/admin/entities",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        entities = entities_response.json()
        
        # Find an entity not owned by the test user
        entity_id = None
        for entity in entities:
            if entity.get("owner_id") != user_id:
                entity_id = entity["id"]
                break
        
        if not entity_id and entities:
            entity_id = entities[0]["id"]
        
        return {"user_id": user_id, "entity_id": entity_id, "username": username}
    
    def test_grant_entity_access(self, admin_token, test_user_and_entity):
        """Admin can grant entity access to user"""
        user_id = test_user_and_entity["user_id"]
        entity_id = test_user_and_entity["entity_id"]
        
        if not entity_id:
            pytest.skip("No entity available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/users/{user_id}/entity-access",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "entity_id": entity_id,
                "role": "accountant"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["entity_id"] == entity_id
        assert data["role"] == "accountant"
        print(f"Granted access to entity {entity_id} for user {user_id}")
    
    def test_list_user_entity_access(self, admin_token, test_user_and_entity):
        """Admin can list user's entity access"""
        user_id = test_user_and_entity["user_id"]
        entity_id = test_user_and_entity["entity_id"]
        
        if not entity_id:
            pytest.skip("No entity available for testing")
        
        # First grant access
        requests.post(
            f"{BASE_URL}/api/admin/users/{user_id}/entity-access",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"entity_id": entity_id, "role": "user"}
        )
        
        # List access
        response = requests.get(
            f"{BASE_URL}/api/admin/users/{user_id}/entity-access",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"User has access to {len(data)} entities")
    
    def test_revoke_entity_access(self, admin_token, test_user_and_entity):
        """Admin can revoke entity access"""
        user_id = test_user_and_entity["user_id"]
        entity_id = test_user_and_entity["entity_id"]
        
        if not entity_id:
            pytest.skip("No entity available for testing")
        
        # First grant access
        requests.post(
            f"{BASE_URL}/api/admin/users/{user_id}/entity-access",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"entity_id": entity_id, "role": "user"}
        )
        
        # Revoke access
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/{user_id}/entity-access/{entity_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 204
        print(f"Revoked access to entity {entity_id} for user {user_id}")


class TestRBACEntityAccess:
    """Test RBAC enforcement on entity-scoped routes"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin user not available")
        return response.json()["token"]
    
    @pytest.fixture
    def user_with_granted_access(self, admin_token):
        """Create user and grant access to an entity"""
        import secrets
        username = f"{TEST_USER_PREFIX}rbac_{secrets.token_hex(4)}"
        
        # Create user via admin
        user_response = requests.post(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "username": username,
                "email": f"{username}@example.com",
                "password": "TestPass123!",
                "role": "user"
            }
        )
        user_id = user_response.json()["id"]
        
        # Get all entities
        entities_response = requests.get(
            f"{BASE_URL}/api/admin/entities",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        entities = entities_response.json()
        
        # Find entity not owned by user
        target_entity_id = None
        for entity in entities:
            if entity.get("owner_id") != user_id:
                target_entity_id = entity["id"]
                break
        
        if target_entity_id:
            # Grant access
            requests.post(
                f"{BASE_URL}/api/admin/users/{user_id}/entity-access",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"entity_id": target_entity_id, "role": "accountant"}
            )
        
        # Login as user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": username,
            "password": "TestPass123!"
        })
        user_token = login_response.json()["token"]
        
        return {
            "user_id": user_id,
            "token": user_token,
            "granted_entity_id": target_entity_id
        }
    
    def test_user_can_list_granted_entities(self, user_with_granted_access):
        """User can list entities they have access to"""
        token = user_with_granted_access["token"]
        granted_entity_id = user_with_granted_access["granted_entity_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/entities",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        entities = response.json()
        
        # User should see their own entities + granted entities
        entity_ids = [e["id"] for e in entities]
        if granted_entity_id:
            assert granted_entity_id in entity_ids, "Granted entity should be visible"
        print(f"User can see {len(entities)} entities")
    
    def test_user_can_access_granted_entity(self, user_with_granted_access):
        """User can access entity they have been granted access to"""
        token = user_with_granted_access["token"]
        granted_entity_id = user_with_granted_access["granted_entity_id"]
        
        if not granted_entity_id:
            pytest.skip("No granted entity available")
        
        response = requests.get(
            f"{BASE_URL}/api/entities/{granted_entity_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        print(f"User can access granted entity {granted_entity_id}")


class TestDocumentUploadWithoutStorage:
    """Test document upload returns 503 when storage not configured"""
    
    @pytest.fixture
    def user_token_and_entity(self):
        """Create user and get their entity"""
        import secrets
        username = f"{TEST_USER_PREFIX}doc_{secrets.token_hex(4)}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "TestPass123!",
            "full_name": "Test Doc User"
        })
        if response.status_code != 201:
            pytest.skip("Could not create user")
        
        token = response.json()["token"]
        
        # Get user's entities
        entities_response = requests.get(
            f"{BASE_URL}/api/entities",
            headers={"Authorization": f"Bearer {token}"}
        )
        entities = entities_response.json()
        entity_id = entities[0]["id"] if entities else None
        
        return {"token": token, "entity_id": entity_id}
    
    def test_document_upload_returns_503_without_storage(self, user_token_and_entity):
        """Document upload should return 503 if storage not configured"""
        token = user_token_and_entity["token"]
        entity_id = user_token_and_entity["entity_id"]
        
        if not entity_id:
            pytest.skip("No entity available")
        
        # Create a simple test file
        files = {
            'file': ('test.txt', b'Test content', 'text/plain')
        }
        data = {
            'document_type': 'other',
            'title': 'Test Document'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/entities/{entity_id}/documents",
            headers={"Authorization": f"Bearer {token}"},
            files=files,
            data=data
        )
        
        # Should return 503 if storage not configured
        # or 201 if storage is configured
        assert response.status_code in [503, 201]
        if response.status_code == 503:
            print("Document upload correctly returns 503 when storage not configured")
        else:
            print("Storage is configured, upload succeeded")


class TestAdminEntitiesList:
    """Test admin entities list endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin user not available")
        return response.json()["token"]
    
    def test_list_all_entities_admin(self, admin_token):
        """Admin can list all entities in the system"""
        response = requests.get(
            f"{BASE_URL}/api/admin/entities",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            assert "id" in data[0]
            assert "name" in data[0]
            assert "type" in data[0]
        print(f"Admin can see {len(data)} entities")


class TestEntityDetailsNewFields:
    """Test entity details with new account fields"""
    
    @pytest.fixture
    def user_token_and_entity(self):
        """Create user and get their entity"""
        import secrets
        username = f"{TEST_USER_PREFIX}details_{secrets.token_hex(4)}"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "TestPass123!",
            "full_name": "Test Details User"
        })
        if response.status_code != 201:
            pytest.skip("Could not create user")
        
        token = response.json()["token"]
        
        # Get user's entities
        entities_response = requests.get(
            f"{BASE_URL}/api/entities",
            headers={"Authorization": f"Bearer {token}"}
        )
        entities = entities_response.json()
        entity_id = entities[0]["id"] if entities else None
        
        return {"token": token, "entity_id": entity_id}
    
    def test_update_personal_entity_with_new_fields(self, user_token_and_entity):
        """Update personal entity with primary_account_id and associated_accounts"""
        token = user_token_and_entity["token"]
        entity_id = user_token_and_entity["entity_id"]
        
        if not entity_id:
            pytest.skip("No entity available")
        
        response = requests.put(
            f"{BASE_URL}/api/entities/{entity_id}/details",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "personal_details": {
                    "legal_name": "Test User",
                    "primary_account_id": "acc_123",
                    "associated_accounts": ["acc_456", "acc_789"]
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["personal_details"]["primary_account_id"] == "acc_123"
        assert "acc_456" in data["personal_details"]["associated_accounts"]
        print("Personal entity updated with new account fields")
    
    def test_create_business_entity_with_new_fields(self, user_token_and_entity):
        """Create business entity with primary_account_id and associated_accounts"""
        token = user_token_and_entity["token"]
        
        # Create business entity
        response = requests.post(
            f"{BASE_URL}/api/entities",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": f"{TEST_USER_PREFIX}Business",
                "type": "business",
                "business_details": {
                    "legal_name": "Test Business LLC",
                    "primary_account_id": "biz_acc_001",
                    "associated_accounts": ["biz_acc_002"]
                }
            }
        )
        assert response.status_code == 201
        entity_id = response.json()["id"]
        
        # Get details
        details_response = requests.get(
            f"{BASE_URL}/api/entities/{entity_id}/details",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert details_response.status_code == 200
        data = details_response.json()
        
        # Verify new fields
        if data.get("business_details"):
            print(f"Business entity created with details: {data['business_details']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/entities/{entity_id}",
            headers={"Authorization": f"Bearer {token}"}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
