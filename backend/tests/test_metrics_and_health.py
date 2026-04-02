"""
Test suite for /api/metrics and /api/health endpoints
Verifies:
- /api/metrics is protected with bearer token
- /api/health returns ok (no regression)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
METRICS_TOKEN = "dev-metrics-token"  # From required_credentials


class TestHealthEndpoint:
    """Health endpoint tests - verify no regression"""
    
    def test_health_returns_ok(self):
        """Health endpoint should return status ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "status" in data, "Response should contain 'status' field"
        assert data["status"] == "ok", f"Expected status 'ok', got '{data['status']}'"
        assert "service" in data, "Response should contain 'service' field"
        print(f"✓ Health check passed: {data}")


class TestMetricsEndpoint:
    """Metrics endpoint tests - verify token protection"""
    
    def test_metrics_without_token_returns_401(self):
        """Metrics endpoint should reject requests without token"""
        response = requests.get(f"{BASE_URL}/api/metrics")
        assert response.status_code == 401, f"Expected 401 without token, got {response.status_code}"
        print(f"✓ Metrics correctly rejects unauthenticated requests: {response.status_code}")
    
    def test_metrics_with_invalid_token_returns_401(self):
        """Metrics endpoint should reject requests with invalid token"""
        headers = {"Authorization": "Bearer invalid-token-12345"}
        response = requests.get(f"{BASE_URL}/api/metrics", headers=headers)
        assert response.status_code == 401, f"Expected 401 with invalid token, got {response.status_code}"
        print(f"✓ Metrics correctly rejects invalid token: {response.status_code}")
    
    def test_metrics_with_valid_token_returns_200(self):
        """Metrics endpoint should accept requests with valid token"""
        headers = {"Authorization": f"Bearer {METRICS_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/metrics", headers=headers)
        assert response.status_code == 200, f"Expected 200 with valid token, got {response.status_code}"
        
        # Verify it returns Prometheus format (text/plain with metrics)
        content_type = response.headers.get("content-type", "")
        assert "text/plain" in content_type, f"Expected text/plain content type, got {content_type}"
        
        # Check for typical Prometheus metrics format
        content = response.text
        assert len(content) > 0, "Metrics response should not be empty"
        print(f"✓ Metrics endpoint returns data with valid token (length: {len(content)} chars)")
        print(f"  Content-Type: {content_type}")
        # Print first 500 chars of metrics for verification
        print(f"  Sample metrics:\n{content[:500]}...")
    
    def test_metrics_with_wrong_auth_scheme_returns_401(self):
        """Metrics endpoint should reject non-Bearer auth schemes"""
        headers = {"Authorization": f"Basic {METRICS_TOKEN}"}
        response = requests.get(f"{BASE_URL}/api/metrics", headers=headers)
        assert response.status_code == 401, f"Expected 401 with wrong auth scheme, got {response.status_code}"
        print(f"✓ Metrics correctly rejects non-Bearer auth: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
