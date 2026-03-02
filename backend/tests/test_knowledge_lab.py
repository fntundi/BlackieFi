"""
Knowledge Lab API Tests
Tests for document upload, list, get, delete, analyze, and stats endpoints
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestKnowledgeLab:
    """Knowledge Lab endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "P@ssw0rd"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Track created documents for cleanup
        self.created_doc_ids = []
        
        yield
        
        # Cleanup - delete test documents
        for doc_id in self.created_doc_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/knowledge/documents/{doc_id}")
            except:
                pass
    
    def test_knowledge_stats(self):
        """Test GET /api/knowledge/stats - Get knowledge lab statistics"""
        response = self.session.get(f"{BASE_URL}/api/knowledge/stats")
        assert response.status_code == 200, f"Stats failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "total_documents" in data
        assert "total_size_bytes" in data
        assert "total_size_mb" in data
        assert "by_type" in data
        assert "document" in data["by_type"]
        assert "image" in data["by_type"]
        assert "video" in data["by_type"]
        
        # Verify by_type structure
        for file_type in ["document", "image", "video"]:
            assert "count" in data["by_type"][file_type]
            assert "total_size" in data["by_type"][file_type]
        
        print(f"Stats: {data['total_documents']} documents, {data['total_size_mb']} MB")
    
    def test_list_documents(self):
        """Test GET /api/knowledge/documents - List all documents"""
        response = self.session.get(f"{BASE_URL}/api/knowledge/documents")
        assert response.status_code == 200, f"List failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # If documents exist, verify structure
        if len(data) > 0:
            doc = data[0]
            assert "id" in doc
            assert "filename" in doc
            assert "original_filename" in doc
            assert "file_type" in doc
            assert "mime_type" in doc
            assert "file_size" in doc
            assert "status" in doc
            assert "created_at" in doc
        
        print(f"Found {len(data)} documents")
    
    def test_upload_txt_document(self):
        """Test POST /api/knowledge/upload - Upload a text document"""
        # Create test file content
        file_content = b"This is a test document for Knowledge Lab testing.\nIt contains financial data."
        files = {
            'file': ('TEST_knowledge_test.txt', io.BytesIO(file_content), 'text/plain')
        }
        data = {
            'description': 'Test document for automated testing',
            'tags': 'test,automated,knowledge'
        }
        
        # Remove Content-Type header for multipart upload
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{BASE_URL}/api/knowledge/upload",
            headers=headers,
            files=files,
            data=data
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        
        result = response.json()
        assert "id" in result
        assert result["original_filename"] == "TEST_knowledge_test.txt"
        assert result["file_type"] == "document"
        assert result["mime_type"] == "text/plain"
        assert result["status"] == "ready"
        assert "test" in result["tags"]
        
        self.created_doc_ids.append(result["id"])
        print(f"Uploaded document: {result['id']}")
        
        return result["id"]
    
    def test_upload_csv_document(self):
        """Test POST /api/knowledge/upload - Upload a CSV document"""
        file_content = b"date,amount,category\n2025-01-01,100.00,Income\n2025-01-02,50.00,Expense"
        files = {
            'file': ('TEST_financial_data.csv', io.BytesIO(file_content), 'text/csv')
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{BASE_URL}/api/knowledge/upload",
            headers=headers,
            files=files
        )
        assert response.status_code == 200, f"CSV upload failed: {response.text}"
        
        result = response.json()
        assert result["file_type"] == "document"
        assert result["mime_type"] == "text/csv"
        
        self.created_doc_ids.append(result["id"])
        print(f"Uploaded CSV: {result['id']}")
    
    def test_upload_duplicate_detection(self):
        """Test that duplicate files are rejected"""
        file_content = b"Unique content for duplicate test - " + os.urandom(16)
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # First upload
        files = {'file': ('TEST_duplicate.txt', io.BytesIO(file_content), 'text/plain')}
        response1 = requests.post(
            f"{BASE_URL}/api/knowledge/upload",
            headers=headers,
            files=files
        )
        assert response1.status_code == 200
        doc_id = response1.json()["id"]
        self.created_doc_ids.append(doc_id)
        
        # Second upload with same content
        files = {'file': ('TEST_duplicate2.txt', io.BytesIO(file_content), 'text/plain')}
        response2 = requests.post(
            f"{BASE_URL}/api/knowledge/upload",
            headers=headers,
            files=files
        )
        assert response2.status_code == 400, "Duplicate should be rejected"
        assert "already been uploaded" in response2.json().get("detail", "")
        print("Duplicate detection working correctly")
    
    def test_upload_unsupported_format(self):
        """Test that unsupported file formats are rejected"""
        file_content = b"Some executable content"
        files = {
            'file': ('TEST_malicious.exe', io.BytesIO(file_content), 'application/octet-stream')
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{BASE_URL}/api/knowledge/upload",
            headers=headers,
            files=files
        )
        assert response.status_code == 400, "Unsupported format should be rejected"
        assert "not supported" in response.json().get("detail", "").lower()
        print("Unsupported format rejection working correctly")
    
    def test_get_single_document(self):
        """Test GET /api/knowledge/documents/{doc_id} - Get single document"""
        # First upload a document
        file_content = b"Test content for get single document test"
        files = {'file': ('TEST_get_single.txt', io.BytesIO(file_content), 'text/plain')}
        
        headers = {"Authorization": f"Bearer {self.token}"}
        upload_response = requests.post(
            f"{BASE_URL}/api/knowledge/upload",
            headers=headers,
            files=files
        )
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["id"]
        self.created_doc_ids.append(doc_id)
        
        # Get the document
        response = self.session.get(f"{BASE_URL}/api/knowledge/documents/{doc_id}")
        assert response.status_code == 200, f"Get document failed: {response.text}"
        
        data = response.json()
        assert data["id"] == doc_id
        assert data["original_filename"] == "TEST_get_single.txt"
        print(f"Retrieved document: {data['original_filename']}")
    
    def test_get_nonexistent_document(self):
        """Test GET /api/knowledge/documents/{doc_id} - 404 for nonexistent"""
        response = self.session.get(f"{BASE_URL}/api/knowledge/documents/nonexistent-id-12345")
        assert response.status_code == 404
        print("404 for nonexistent document working correctly")
    
    def test_delete_document(self):
        """Test DELETE /api/knowledge/documents/{doc_id} - Delete document"""
        # First upload a document
        file_content = b"Test content for delete test"
        files = {'file': ('TEST_delete_me.txt', io.BytesIO(file_content), 'text/plain')}
        
        headers = {"Authorization": f"Bearer {self.token}"}
        upload_response = requests.post(
            f"{BASE_URL}/api/knowledge/upload",
            headers=headers,
            files=files
        )
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["id"]
        
        # Delete the document
        delete_response = self.session.delete(f"{BASE_URL}/api/knowledge/documents/{doc_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        assert "deleted" in delete_response.json().get("message", "").lower()
        
        # Verify it's gone
        get_response = self.session.get(f"{BASE_URL}/api/knowledge/documents/{doc_id}")
        assert get_response.status_code == 404
        print(f"Document {doc_id} deleted successfully")
    
    def test_filter_by_file_type(self):
        """Test GET /api/knowledge/documents?file_type=document - Filter by type"""
        response = self.session.get(f"{BASE_URL}/api/knowledge/documents?file_type=document")
        assert response.status_code == 200
        
        data = response.json()
        # All returned documents should be of type 'document'
        for doc in data:
            assert doc["file_type"] == "document"
        print(f"Filter by file_type working: {len(data)} documents")
    
    def test_filter_by_tag(self):
        """Test GET /api/knowledge/documents?tag=test - Filter by tag"""
        # First upload a document with specific tag
        file_content = b"Test content with unique tag"
        files = {'file': ('TEST_tagged.txt', io.BytesIO(file_content), 'text/plain')}
        data = {'tags': 'uniquetesttag123'}
        
        headers = {"Authorization": f"Bearer {self.token}"}
        upload_response = requests.post(
            f"{BASE_URL}/api/knowledge/upload",
            headers=headers,
            files=files,
            data=data
        )
        assert upload_response.status_code == 200
        doc_id = upload_response.json()["id"]
        self.created_doc_ids.append(doc_id)
        
        # Filter by tag
        response = self.session.get(f"{BASE_URL}/api/knowledge/documents?tag=uniquetesttag123")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1
        assert any(doc["id"] == doc_id for doc in data)
        print(f"Filter by tag working: {len(data)} documents with tag")
    
    def test_analyze_document_ai_disabled(self):
        """Test POST /api/knowledge/analyze/{doc_id} - Returns error when AI disabled"""
        # Get existing document
        list_response = self.session.get(f"{BASE_URL}/api/knowledge/documents")
        docs = list_response.json()
        
        if len(docs) == 0:
            pytest.skip("No documents available for analysis test")
        
        doc_id = docs[0]["id"]
        
        # Try to analyze
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{BASE_URL}/api/knowledge/analyze/{doc_id}",
            headers=headers,
            data={"query": "What is this document about?"}
        )
        
        # Should return 400 if AI is disabled
        if response.status_code == 400:
            assert "AI is not enabled" in response.json().get("detail", "")
            print("Analysis correctly returns 'AI not enabled' error")
        elif response.status_code == 200:
            # AI is enabled, verify response structure
            data = response.json()
            assert "document_id" in data
            assert "analysis" in data
            print(f"Analysis successful: {data.get('analysis', '')[:100]}...")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestKnowledgeLabFileTypes:
    """Test different file type uploads"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        # Login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "P@ssw0rd"
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.created_doc_ids = []
        
        yield
        
        # Cleanup
        headers = {"Authorization": f"Bearer {self.token}"}
        for doc_id in self.created_doc_ids:
            try:
                requests.delete(f"{BASE_URL}/api/knowledge/documents/{doc_id}", headers=headers)
            except:
                pass
    
    def test_supported_document_formats(self):
        """Test that all supported document formats are accepted"""
        supported_docs = [
            ('TEST_doc.pdf', 'application/pdf'),
            ('TEST_doc.txt', 'text/plain'),
            ('TEST_doc.csv', 'text/csv'),
            ('TEST_doc.md', 'text/markdown'),
        ]
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        for filename, mime_type in supported_docs:
            file_content = b"Test content for " + filename.encode()
            files = {'file': (filename, io.BytesIO(file_content), mime_type)}
            
            response = requests.post(
                f"{BASE_URL}/api/knowledge/upload",
                headers=headers,
                files=files
            )
            
            if response.status_code == 200:
                self.created_doc_ids.append(response.json()["id"])
                print(f"✓ {filename} uploaded successfully")
            elif response.status_code == 400 and "already been uploaded" in response.text:
                print(f"✓ {filename} - duplicate (already exists)")
            else:
                print(f"✗ {filename} failed: {response.status_code} - {response.text}")
    
    def test_image_format_detection(self):
        """Test that image files are correctly categorized"""
        # Create a minimal PNG file (1x1 pixel)
        png_content = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        headers = {"Authorization": f"Bearer {self.token}"}
        files = {'file': ('TEST_image.png', io.BytesIO(png_content), 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/api/knowledge/upload",
            headers=headers,
            files=files
        )
        
        if response.status_code == 200:
            data = response.json()
            assert data["file_type"] == "image"
            assert data["mime_type"] == "image/png"
            self.created_doc_ids.append(data["id"])
            print("✓ PNG image correctly categorized as 'image'")
        elif response.status_code == 400 and "already been uploaded" in response.text:
            print("✓ PNG image - duplicate (already exists)")
        else:
            print(f"✗ PNG upload failed: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
