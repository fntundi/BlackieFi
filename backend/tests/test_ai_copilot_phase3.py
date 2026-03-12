"""
AI Co-Pilot Phase 3 Tests - Strategy Studio and Analysis Lab
Tests for new AI-powered investment analysis features using Emergent LLM Key
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestStrategyStudio:
    """Strategy Studio endpoint tests - Investment frameworks and strategy analysis"""
    
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
        
        # Track created frameworks for cleanup
        self.created_framework_ids = []
        
        yield
        
        # Cleanup - delete test frameworks
        for fw_id in self.created_framework_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/strategy/frameworks/{fw_id}")
            except:
                pass
    
    def test_get_frameworks(self):
        """Test GET /api/strategy/frameworks - Get all investment frameworks"""
        response = self.session.get(f"{BASE_URL}/api/strategy/frameworks")
        assert response.status_code == 200, f"Get frameworks failed: {response.text}"
        
        data = response.json()
        assert "frameworks" in data
        frameworks = data["frameworks"]
        assert isinstance(frameworks, list)
        
        # Should have at least the 5 default frameworks
        assert len(frameworks) >= 5, f"Expected at least 5 default frameworks, got {len(frameworks)}"
        
        # Verify default frameworks exist
        framework_names = [fw["name"] for fw in frameworks]
        expected_defaults = [
            "Value Investing (Graham/Buffett)",
            "Growth Investing",
            "Dividend Income",
            "Momentum Trading",
            "Real Estate Analysis"
        ]
        for expected in expected_defaults:
            assert expected in framework_names, f"Missing default framework: {expected}"
        
        # Verify framework structure
        for fw in frameworks:
            assert "id" in fw
            assert "name" in fw
            assert "description" in fw
            assert "framework_type" in fw
            assert "risk_tolerance" in fw
            assert "time_horizon" in fw
            assert "is_active" in fw
        
        print(f"Found {len(frameworks)} frameworks including defaults")
    
    def test_create_custom_framework(self):
        """Test POST /api/strategy/frameworks - Create custom framework"""
        framework_data = {
            "name": "TEST_Custom Framework",
            "description": "A test custom investment framework",
            "framework_type": "custom",
            "risk_tolerance": "moderate",
            "time_horizon": "medium",
            "parameters": {
                "min_market_cap": 1000000000,
                "max_pe_ratio": 25
            },
            "is_active": True
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/strategy/frameworks",
            json=framework_data
        )
        assert response.status_code == 200, f"Create framework failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "message" in data
        
        self.created_framework_ids.append(data["id"])
        print(f"Created custom framework: {data['id']}")
        
        return data["id"]
    
    def test_delete_custom_framework(self):
        """Test DELETE /api/strategy/frameworks/{id} - Delete custom framework"""
        # First create a framework
        framework_data = {
            "name": "TEST_Delete Framework",
            "description": "Framework to be deleted",
            "framework_type": "custom",
            "risk_tolerance": "aggressive",
            "time_horizon": "short",
            "parameters": {},
            "is_active": True
        }
        
        create_response = self.session.post(
            f"{BASE_URL}/api/strategy/frameworks",
            json=framework_data
        )
        assert create_response.status_code == 200
        fw_id = create_response.json()["id"]
        
        # Delete the framework
        delete_response = self.session.delete(f"{BASE_URL}/api/strategy/frameworks/{fw_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify it's gone
        get_response = self.session.get(f"{BASE_URL}/api/strategy/frameworks")
        frameworks = get_response.json()["frameworks"]
        assert not any(fw["id"] == fw_id for fw in frameworks)
        
        print(f"Framework {fw_id} deleted successfully")
    
    def test_analyze_with_strategy(self):
        """Test POST /api/strategy/analyze - Analyze investment with strategy"""
        analysis_request = {
            "framework_id": "default_0",  # Value Investing framework
            "asset_type": "stock",
            "ticker_or_name": "AAPL",
            "additional_context": "Looking for long-term investment"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/strategy/analyze",
            json=analysis_request
        )
        
        # Should return 200 if AI is enabled, 400 if disabled
        if response.status_code == 400:
            error = response.json().get("detail", "")
            if "AI is not enabled" in error:
                print("Strategy analysis: AI is disabled (expected behavior)")
                pytest.skip("AI is disabled")
            else:
                pytest.fail(f"Unexpected error: {error}")
        
        assert response.status_code == 200, f"Analysis failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "framework" in data
        assert "asset" in data
        assert "analysis" in data
        assert "model_used" in data
        
        print(f"Strategy analysis successful using {data['model_used']}")
        print(f"Analysis preview: {data['analysis'][:200]}...")
    
    def test_analyze_with_growth_framework(self):
        """Test strategy analysis with Growth Investing framework"""
        analysis_request = {
            "framework_id": "default_1",  # Growth Investing framework
            "asset_type": "stock",
            "ticker_or_name": "NVDA"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/strategy/analyze",
            json=analysis_request
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Analysis failed: {response.text}"
        data = response.json()
        assert "Growth Investing" in data.get("framework", "")
        print(f"Growth analysis for NVDA completed")
    
    def test_analyze_real_estate(self):
        """Test strategy analysis for real estate"""
        analysis_request = {
            "framework_id": "default_4",  # Real Estate Analysis framework
            "asset_type": "real_estate",
            "ticker_or_name": "123 Main Street, Austin TX"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/strategy/analyze",
            json=analysis_request
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Analysis failed: {response.text}"
        data = response.json()
        assert data.get("asset_type") == "real_estate"
        print(f"Real estate analysis completed")
    
    def test_compare_strategies(self):
        """Test POST /api/strategy/compare - Compare multiple strategies"""
        compare_request = {
            "asset_type": "stock",
            "ticker_or_name": "MSFT",
            "framework_ids": ["default_0", "default_1", "default_2"]  # Value, Growth, Dividend
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/strategy/compare",
            json=compare_request
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Compare failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "frameworks_compared" in data
        assert "comparison_analysis" in data
        assert len(data["frameworks_compared"]) >= 2
        
        print(f"Compared {len(data['frameworks_compared'])} frameworks for MSFT")
    
    def test_get_strategy_history(self):
        """Test GET /api/strategy/history - Get analysis history"""
        response = self.session.get(f"{BASE_URL}/api/strategy/history")
        assert response.status_code == 200, f"Get history failed: {response.text}"
        
        data = response.json()
        assert "analyses" in data
        assert isinstance(data["analyses"], list)
        
        # Verify structure if there are analyses
        if len(data["analyses"]) > 0:
            analysis = data["analyses"][0]
            assert "id" in analysis
            assert "framework" in analysis
            assert "asset" in analysis
            assert "created_at" in analysis
        
        print(f"Found {len(data['analyses'])} strategy analyses in history")


class TestAnalysisLab:
    """Analysis Lab endpoint tests - Comprehensive analysis, risk assessment, due diligence"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "P@ssw0rd"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
    
    def test_comprehensive_analysis_stock(self):
        """Test POST /api/analysis/comprehensive - Stock analysis"""
        request_data = {
            "asset_type": "stock",
            "identifier": "GOOGL",
            "analysis_depth": "standard",
            "include_sections": []
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/analysis/comprehensive",
            json=request_data
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Analysis failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "analysis_id" in data
        assert "analysis" in data
        assert "key_metrics" in data
        assert data.get("asset_type") == "stock"
        assert data.get("identifier") == "GOOGL"
        
        print(f"Comprehensive stock analysis completed: {data['analysis_id']}")
    
    def test_comprehensive_analysis_crypto(self):
        """Test comprehensive analysis for cryptocurrency"""
        request_data = {
            "asset_type": "crypto",
            "identifier": "Bitcoin",
            "analysis_depth": "quick"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/analysis/comprehensive",
            json=request_data
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Analysis failed: {response.text}"
        data = response.json()
        assert data.get("asset_type") == "crypto"
        print(f"Crypto analysis completed")
    
    def test_comprehensive_analysis_deep(self):
        """Test deep analysis depth"""
        request_data = {
            "asset_type": "stock",
            "identifier": "AMZN",
            "analysis_depth": "deep"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/analysis/comprehensive",
            json=request_data
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Analysis failed: {response.text}"
        data = response.json()
        assert data.get("depth") == "deep"
        print(f"Deep analysis completed")
    
    def test_risk_assessment(self):
        """Test POST /api/analysis/risk-assessment - Risk evaluation"""
        request_data = {
            "asset_type": "stock",
            "identifier": "TSLA",
            "investment_amount": 50000.00,
            "time_horizon": "medium"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/analysis/risk-assessment",
            json=request_data
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Risk assessment failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "risk_assessment" in data
        assert data.get("investment_amount") == 50000.00
        assert data.get("time_horizon") == "medium"
        
        print(f"Risk assessment completed for ${data['investment_amount']}")
    
    def test_risk_assessment_long_horizon(self):
        """Test risk assessment with long time horizon"""
        request_data = {
            "asset_type": "real_estate",
            "identifier": "Commercial Property NYC",
            "investment_amount": 500000.00,
            "time_horizon": "long"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/analysis/risk-assessment",
            json=request_data
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Risk assessment failed: {response.text}"
        data = response.json()
        assert data.get("time_horizon") == "long"
        print(f"Long-term risk assessment completed")
    
    def test_due_diligence(self):
        """Test POST /api/analysis/due-diligence - Due diligence checklist"""
        request_data = {
            "asset_type": "private_equity",
            "identifier": "TechStartup Inc",
            "deal_size": 1000000.00
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/analysis/due-diligence",
            json=request_data
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Due diligence failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "due_diligence_checklist" in data
        assert data.get("deal_size") == 1000000.00
        
        print(f"Due diligence checklist generated")
    
    def test_due_diligence_no_deal_size(self):
        """Test due diligence without deal size"""
        request_data = {
            "asset_type": "stock",
            "identifier": "META"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/analysis/due-diligence",
            json=request_data
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Due diligence failed: {response.text}"
        data = response.json()
        assert data.get("deal_size") is None
        print(f"Due diligence without deal size completed")
    
    def test_market_research(self):
        """Test POST /api/analysis/market-research - Sector research"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/analysis/market-research",
            headers=headers,
            data={"sector": "Technology", "focus_area": "AI and Machine Learning"}
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Market research failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "research" in data
        assert data.get("sector") == "Technology"
        
        print(f"Market research completed for {data['sector']}")
    
    def test_market_research_healthcare(self):
        """Test market research for healthcare sector"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/analysis/market-research",
            headers=headers,
            data={"sector": "Healthcare"}
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Market research failed: {response.text}"
        data = response.json()
        assert data.get("sector") == "Healthcare"
        print(f"Healthcare market research completed")
    
    def test_portfolio_analysis(self):
        """Test POST /api/analysis/portfolio-analysis - Portfolio evaluation"""
        # First get an entity ID
        entities_response = self.session.get(f"{BASE_URL}/api/entities")
        assert entities_response.status_code == 200
        entities = entities_response.json()
        
        if not entities:
            pytest.skip("No entities available for portfolio analysis")
        
        entity_id = entities[0]["id"]
        
        headers = {"Authorization": f"Bearer {self.token}"}
        response = requests.post(
            f"{BASE_URL}/api/analysis/portfolio-analysis",
            headers=headers,
            data={"entity_id": entity_id}
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Portfolio analysis failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "analysis" in data
        assert "total_value" in data
        
        print(f"Portfolio analysis completed: ${data['total_value']:,.2f}")
    
    def test_get_analysis_history(self):
        """Test GET /api/analysis/history - Get analysis history"""
        response = self.session.get(f"{BASE_URL}/api/analysis/history")
        assert response.status_code == 200, f"Get history failed: {response.text}"
        
        data = response.json()
        assert "analyses" in data
        assert isinstance(data["analyses"], list)
        
        print(f"Found {len(data['analyses'])} analyses in history")
    
    def test_get_analysis_history_filtered(self):
        """Test analysis history with type filter"""
        response = self.session.get(f"{BASE_URL}/api/analysis/history?analysis_type=comprehensive")
        assert response.status_code == 200, f"Get filtered history failed: {response.text}"
        
        data = response.json()
        # All returned analyses should be comprehensive type
        for analysis in data["analyses"]:
            assert analysis.get("type") == "comprehensive"
        
        print(f"Found {len(data['analyses'])} comprehensive analyses")


class TestKnowledgeLabChat:
    """Knowledge Lab chat endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "P@ssw0rd"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
    
    def test_chat_with_knowledge_base(self):
        """Test POST /api/knowledge/chat - Chat with knowledge base"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/knowledge/chat",
            headers=headers,
            data={"message": "What documents do I have in my knowledge base?"}
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        
        data = response.json()
        assert "response" in data
        assert "success" in data
        
        print(f"Chat response: {data['response'][:200]}...")
    
    def test_chat_financial_question(self):
        """Test chat with financial question"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/knowledge/chat",
            headers=headers,
            data={"message": "Can you help me analyze my investment portfolio?"}
        )
        
        if response.status_code == 400 and "AI is not enabled" in response.json().get("detail", ""):
            pytest.skip("AI is disabled")
        
        assert response.status_code == 200, f"Chat failed: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"Financial chat completed")


class TestAIStatusIntegration:
    """Test AI status affects all endpoints correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": "P@ssw0rd"
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        yield
    
    def test_ai_status_endpoint(self):
        """Test GET /api/settings/ai-status - Check AI status"""
        response = self.session.get(f"{BASE_URL}/api/settings/ai-status")
        assert response.status_code == 200, f"AI status check failed: {response.text}"
        
        data = response.json()
        # Should have AI status fields
        assert "system_ai_enabled" in data or "user_ai_enabled" in data
        
        ai_enabled = data.get("system_ai_enabled", False) or data.get("user_ai_enabled", False)
        print(f"AI Status: {'Enabled' if ai_enabled else 'Disabled'}")
        
        return ai_enabled


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
