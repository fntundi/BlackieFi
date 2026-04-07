#!/usr/bin/env python3
"""
BlackieFi 3.0 - Microservices Architecture Verification Test
This test verifies the complete microservices architecture setup without running Docker.
"""
import os
import sys
import json
import yaml
from pathlib import Path
from datetime import datetime

class BlackieFiArchitectureTest:
    def __init__(self):
        self.root_path = Path("/app")
        self.tests_run = 0
        self.tests_passed = 0
        self.issues = []
        self.results = {
            "file_structure": {},
            "docker_compose": {},
            "makefile": {},
            "env_template": {},
            "nginx_config": {},
            "services": {},
            "data_persistence": {},
            "frontend": {}
        }

    def log_test(self, category, test_name, passed, details=""):
        """Log test result"""
        self.tests_run += 1
        if passed:
            self.tests_passed += 1
            print(f"✅ {category}: {test_name}")
        else:
            print(f"❌ {category}: {test_name} - {details}")
            self.issues.append(f"{category}: {test_name} - {details}")
        
        if category not in self.results:
            self.results[category] = {}
        self.results[category][test_name] = {"passed": passed, "details": details}

    def test_required_files(self):
        """Test that all required files exist"""
        print("\n🔍 Testing Required Files...")
        
        required_files = [
            "docker-compose.yml",
            "Makefile", 
            ".env.template",
            "infrastructure/nginx.conf",
            "services/auth/main.py",
            "services/core/main.py", 
            "services/entity/main.py",
            "services/portfolio/main.py",
            "services/assets/main.py",
            "services/gateway-app/src/index.ts",
            "services/shared/config.py",
            "frontend/src/App.js"
        ]
        
        for file_path in required_files:
            full_path = self.root_path / file_path
            exists = full_path.exists()
            self.log_test("file_structure", f"{file_path} exists", exists, 
                         f"File not found at {full_path}" if not exists else "")

    def test_project_structure(self):
        """Test project directory structure"""
        print("\n🔍 Testing Project Structure...")
        
        required_dirs = [
            "services/gateway-app",
            "services/auth", 
            "services/core",
            "services/entity",
            "services/portfolio",
            "services/assets",
            "services/shared",
            "frontend",
            "infrastructure",
            "data/mongo",
            "data/redis", 
            "data/chroma",
            "data/ollama"
        ]
        
        for dir_path in required_dirs:
            full_path = self.root_path / dir_path
            exists = full_path.exists() and full_path.is_dir()
            self.log_test("file_structure", f"Directory {dir_path} exists", exists,
                         f"Directory not found at {full_path}" if not exists else "")

    def test_docker_compose(self):
        """Test docker-compose.yml configuration"""
        print("\n🔍 Testing Docker Compose Configuration...")
        
        compose_file = self.root_path / "docker-compose.yml"
        if not compose_file.exists():
            self.log_test("docker_compose", "docker-compose.yml exists", False, "File not found")
            return
            
        try:
            with open(compose_file) as f:
                compose_data = yaml.safe_load(f)
            
            # Test required services
            required_services = [
                "mongo", "redis", "chroma", "ollama", 
                "auth", "core", "entity", "portfolio", "assets",
                "gateway-app", "nginx", "frontend"
            ]
            
            services = compose_data.get("services", {})
            for service in required_services:
                exists = service in services
                self.log_test("docker_compose", f"Service {service} defined", exists,
                             f"Service {service} not found in docker-compose.yml" if not exists else "")
            
            # Test healthchecks
            for service_name, service_config in services.items():
                has_healthcheck = "healthcheck" in service_config
                self.log_test("docker_compose", f"Service {service_name} has healthcheck", 
                             has_healthcheck, f"No healthcheck defined for {service_name}" if not has_healthcheck else "")
            
            # Test networks
            has_networks = "networks" in compose_data
            self.log_test("docker_compose", "Networks defined", has_networks,
                         "No networks section found" if not has_networks else "")
                         
        except Exception as e:
            self.log_test("docker_compose", "Valid YAML format", False, f"YAML parsing error: {e}")

    def test_makefile(self):
        """Test Makefile targets"""
        print("\n🔍 Testing Makefile...")
        
        makefile = self.root_path / "Makefile"
        if not makefile.exists():
            self.log_test("makefile", "Makefile exists", False, "File not found")
            return
            
        try:
            with open(makefile) as f:
                content = f.read()
            
            required_targets = ["up", "down", "logs", "reset"]
            for target in required_targets:
                has_target = f"{target}:" in content
                self.log_test("makefile", f"Target '{target}' exists", has_target,
                             f"Target {target} not found in Makefile" if not has_target else "")
                             
        except Exception as e:
            self.log_test("makefile", "Readable Makefile", False, f"Error reading Makefile: {e}")

    def test_env_template(self):
        """Test .env.template configuration"""
        print("\n🔍 Testing Environment Template...")
        
        env_template = self.root_path / ".env.template"
        if not env_template.exists():
            self.log_test("env_template", ".env.template exists", False, "File not found")
            return
            
        try:
            with open(env_template) as f:
                content = f.read()
            
            required_vars = [
                "JWT_SECRET", "JWT_ALGORITHM", "JWT_EXPIRATION_HOURS",
                "MONGO_URL", "MONGO_DB", "MONGO_INITDB_ROOT_USERNAME", "MONGO_INITDB_ROOT_PASSWORD",
                "REDIS_URL", "CHROMA_HOST", "CHROMA_PORT",
                "OLLAMA_HOST", "OLLAMA_PORT", "OLLAMA_MODEL",
                "AUTH_SERVICE_URL", "CORE_SERVICE_URL", "ENTITY_SERVICE_URL", 
                "PORTFOLIO_SERVICE_URL", "ASSETS_SERVICE_URL",
                "CORS_ORIGINS", "LOG_LEVEL"
            ]
            
            for var in required_vars:
                has_var = f"{var}=" in content
                self.log_test("env_template", f"Variable {var} defined", has_var,
                             f"Environment variable {var} not found" if not has_var else "")
                             
        except Exception as e:
            self.log_test("env_template", "Readable .env.template", False, f"Error reading file: {e}")

    def test_nginx_config(self):
        """Test nginx.conf routing"""
        print("\n🔍 Testing Nginx Configuration...")
        
        nginx_conf = self.root_path / "infrastructure/nginx.conf"
        if not nginx_conf.exists():
            self.log_test("nginx_config", "nginx.conf exists", False, "File not found")
            return
            
        try:
            with open(nginx_conf) as f:
                content = f.read()
            
            required_routes = [
                "/api/auth/", "/api/entities/", "/api/accounts/", "/api/assets/", "/api/"
            ]
            
            for route in required_routes:
                has_route = f"location {route}" in content
                self.log_test("nginx_config", f"Route {route} configured", has_route,
                             f"Route {route} not found in nginx.conf" if not has_route else "")
            
            # Test upstream definitions
            required_upstreams = ["gateway_app", "frontend"]
            for upstream in required_upstreams:
                has_upstream = f"upstream {upstream}" in content
                self.log_test("nginx_config", f"Upstream {upstream} defined", has_upstream,
                             f"Upstream {upstream} not found" if not has_upstream else "")
                             
        except Exception as e:
            self.log_test("nginx_config", "Readable nginx.conf", False, f"Error reading file: {e}")

    def test_service_structure(self):
        """Test individual service structure"""
        print("\n🔍 Testing Service Structure...")
        
        python_services = ["auth", "core", "entity", "portfolio", "assets"]
        for service in python_services:
            service_dir = self.root_path / "services" / service
            
            # Test main.py exists
            main_py = service_dir / "main.py"
            exists = main_py.exists()
            self.log_test("services", f"{service}/main.py exists", exists,
                         f"main.py not found in {service} service" if not exists else "")
            
            # Test Dockerfile exists
            dockerfile = service_dir / "Dockerfile"
            exists = dockerfile.exists()
            self.log_test("services", f"{service}/Dockerfile exists", exists,
                         f"Dockerfile not found in {service} service" if not exists else "")
        
        # Test gateway-app structure
        gateway_dir = self.root_path / "services/gateway-app"
        
        gateway_files = ["src/index.ts", "package.json", "Dockerfile", "tsconfig.json"]
        for file_name in gateway_files:
            file_path = gateway_dir / file_name
            exists = file_path.exists()
            self.log_test("services", f"gateway-app/{file_name} exists", exists,
                         f"{file_name} not found in gateway-app" if not exists else "")
        
        # Test shared module
        shared_dir = self.root_path / "services/shared"
        shared_files = ["config.py", "database.py", "auth_utils.py", "models.py"]
        for file_name in shared_files:
            file_path = shared_dir / file_name
            exists = file_path.exists()
            self.log_test("services", f"shared/{file_name} exists", exists,
                         f"{file_name} not found in shared module" if not exists else "")

    def test_data_persistence(self):
        """Test data persistence directories"""
        print("\n🔍 Testing Data Persistence...")
        
        data_dirs = ["mongo", "redis", "chroma", "ollama"]
        for data_dir in data_dirs:
            dir_path = self.root_path / "data" / data_dir
            exists = dir_path.exists() and dir_path.is_dir()
            self.log_test("data_persistence", f"data/{data_dir} directory exists", exists,
                         f"Data directory {data_dir} not found" if not exists else "")

    def test_frontend_components(self):
        """Test frontend App.js components"""
        print("\n🔍 Testing Frontend Components...")
        
        app_js = self.root_path / "frontend/src/App.js"
        if not app_js.exists():
            self.log_test("frontend", "App.js exists", False, "File not found")
            return
            
        try:
            with open(app_js) as f:
                content = f.read()
            
            required_components = [
                "AuthForm", "Dashboard", "useAuth", "EntityForm", "AccountForm", "AssetForm"
            ]
            
            for component in required_components:
                has_component = component in content
                self.log_test("frontend", f"Component {component} exists", has_component,
                             f"Component {component} not found in App.js" if not has_component else "")
            
            # Test data-testid attributes for testing
            testid_patterns = [
                'data-testid="auth-container"',
                'data-testid="dashboard"', 
                'data-testid="nav-overview"',
                'data-testid="entities-tab"'
            ]
            
            for pattern in testid_patterns:
                has_testid = pattern in content
                self.log_test("frontend", f"Test ID {pattern} exists", has_testid,
                             f"Test ID {pattern} not found" if not has_testid else "")
                             
        except Exception as e:
            self.log_test("frontend", "Readable App.js", False, f"Error reading file: {e}")

    def run_all_tests(self):
        """Run all architecture verification tests"""
        print("🚀 BlackieFi 3.0 - Microservices Architecture Verification")
        print("=" * 60)
        
        self.test_required_files()
        self.test_project_structure()
        self.test_docker_compose()
        self.test_makefile()
        self.test_env_template()
        self.test_nginx_config()
        self.test_service_structure()
        self.test_data_persistence()
        self.test_frontend_components()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.issues:
            print(f"\n❌ Issues Found ({len(self.issues)}):")
            for issue in self.issues:
                print(f"  • {issue}")
        else:
            print("\n✅ All tests passed! Architecture is properly configured.")
        
        # Calculate success percentage
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = BlackieFiArchitectureTest()
    success = tester.run_all_tests()
    
    # Save detailed results
    results_file = Path("/app/test_reports/architecture_verification.json")
    results_file.parent.mkdir(exist_ok=True)
    
    with open(results_file, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
            },
            "results": tester.results,
            "issues": tester.issues
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())