"""
BlackieFi 3.0 - Docker Infrastructure Validation Tests
Tests file content validation for Docker infrastructure (no Docker runtime required)
"""
import pytest
import os
import yaml
import re

# Base paths
APP_ROOT = "/app"

class TestDockerComposeYAML:
    """Verify docker-compose.yml is valid YAML with all required services"""
    
    def test_docker_compose_is_valid_yaml(self):
        """docker-compose.yml should be valid YAML"""
        compose_path = os.path.join(APP_ROOT, "docker-compose.yml")
        assert os.path.exists(compose_path), "docker-compose.yml not found"
        
        with open(compose_path, 'r') as f:
            content = f.read()
        
        # Parse YAML
        try:
            compose = yaml.safe_load(content)
            assert compose is not None, "docker-compose.yml is empty"
            assert 'services' in compose, "docker-compose.yml missing 'services' key"
        except yaml.YAMLError as e:
            pytest.fail(f"docker-compose.yml is not valid YAML: {e}")
    
    def test_docker_compose_has_all_13_services(self):
        """docker-compose.yml should have all 13 required services"""
        compose_path = os.path.join(APP_ROOT, "docker-compose.yml")
        with open(compose_path, 'r') as f:
            compose = yaml.safe_load(f)
        
        required_services = [
            'auth', 'core', 'entity', 'portfolio', 'assets',
            'gateway-app', 'nginx', 'mongo', 'redis', 'chroma',
            'ollama', 'ollama-init', 'frontend'
        ]
        
        actual_services = list(compose['services'].keys())
        
        for service in required_services:
            assert service in actual_services, f"Missing service: {service}"
        
        print(f"All 13 services found: {actual_services}")
    
    def test_service_ports_match_architecture(self):
        """Verify service ports match architecture spec"""
        compose_path = os.path.join(APP_ROOT, "docker-compose.yml")
        with open(compose_path, 'r') as f:
            compose = yaml.safe_load(f)
        
        # Check healthcheck ports (internal ports)
        services = compose['services']
        
        # Auth service should use port 8001
        auth_healthcheck = services['auth']['healthcheck']['test']
        assert '8001' in str(auth_healthcheck), "Auth service should use port 8001"
        
        # Core service should use port 8002
        core_healthcheck = services['core']['healthcheck']['test']
        assert '8002' in str(core_healthcheck), "Core service should use port 8002"
        
        # Entity service should use port 8003
        entity_healthcheck = services['entity']['healthcheck']['test']
        assert '8003' in str(entity_healthcheck), "Entity service should use port 8003"
        
        # Portfolio service should use port 8004
        portfolio_healthcheck = services['portfolio']['healthcheck']['test']
        assert '8004' in str(portfolio_healthcheck), "Portfolio service should use port 8004"
        
        # Assets service should use port 8005
        assets_healthcheck = services['assets']['healthcheck']['test']
        assert '8005' in str(assets_healthcheck), "Assets service should use port 8005"
        
        # Gateway-app should use port 8000
        gateway_healthcheck = services['gateway-app']['healthcheck']['test']
        assert '8000' in str(gateway_healthcheck), "Gateway-app should use port 8000"
        
        # Nginx should expose port 8080
        nginx_ports = services['nginx']['ports']
        assert any('8080' in str(p) for p in nginx_ports), "Nginx should expose port 8080"
        
        print("All service ports match architecture specification")


class TestDockerfilesNoLockFiles:
    """Verify NO Dockerfile references lock files"""
    
    dockerfiles = [
        "services/auth/Dockerfile",
        "services/core/Dockerfile",
        "services/entity/Dockerfile",
        "services/portfolio/Dockerfile",
        "services/assets/Dockerfile",
        "services/gateway-app/Dockerfile",
        "frontend/Dockerfile.docker",
    ]
    
    lock_file_patterns = [
        r'yarn\.lock',
        r'package-lock\.json',
        r'--frozen-lockfile',
        r'package\*\.json',  # package*.json pattern
    ]
    
    @pytest.mark.parametrize("dockerfile", dockerfiles)
    def test_dockerfile_no_lock_file_references(self, dockerfile):
        """Dockerfile should not reference lock files"""
        dockerfile_path = os.path.join(APP_ROOT, dockerfile)
        
        if not os.path.exists(dockerfile_path):
            pytest.skip(f"Dockerfile not found: {dockerfile}")
        
        with open(dockerfile_path, 'r') as f:
            content = f.read()
        
        for pattern in self.lock_file_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            assert not matches, f"{dockerfile} contains lock file reference: {matches}"
        
        print(f"PASS: {dockerfile} has no lock file references")


class TestPythonDockerfilesCurl:
    """Verify all Python service Dockerfiles install curl for health checks"""
    
    python_dockerfiles = [
        "services/auth/Dockerfile",
        "services/core/Dockerfile",
        "services/entity/Dockerfile",
        "services/portfolio/Dockerfile",
        "services/assets/Dockerfile",
    ]
    
    @pytest.mark.parametrize("dockerfile", python_dockerfiles)
    def test_python_dockerfile_installs_curl(self, dockerfile):
        """Python Dockerfile should install curl"""
        dockerfile_path = os.path.join(APP_ROOT, dockerfile)
        
        if not os.path.exists(dockerfile_path):
            pytest.skip(f"Dockerfile not found: {dockerfile}")
        
        with open(dockerfile_path, 'r') as f:
            content = f.read()
        
        # Check for curl installation
        assert 'curl' in content.lower(), f"{dockerfile} should install curl for health checks"
        assert 'apt-get' in content or 'apk add' in content, f"{dockerfile} should use package manager to install curl"
        
        print(f"PASS: {dockerfile} installs curl")


class TestGatewayAppDockerfile:
    """Verify Gateway App Dockerfile only copies package.json"""
    
    def test_gateway_app_copies_only_package_json(self):
        """Gateway App Dockerfile should only copy package.json (not package*.json or lock files)"""
        dockerfile_path = os.path.join(APP_ROOT, "services/gateway-app/Dockerfile")
        
        with open(dockerfile_path, 'r') as f:
            content = f.read()
        
        # Should have COPY package.json
        assert 'COPY' in content and 'package.json' in content, "Should copy package.json"
        
        # Should NOT have package*.json pattern
        assert 'package*.json' not in content, "Should not use package*.json pattern"
        
        # Should NOT copy yarn.lock or package-lock.json
        assert 'yarn.lock' not in content, "Should not copy yarn.lock"
        assert 'package-lock.json' not in content, "Should not copy package-lock.json"
        
        print("PASS: Gateway App Dockerfile only copies package.json")


class TestFrontendDockerfile:
    """Verify Frontend Dockerfile only copies package.json and does NOT use --frozen-lockfile"""
    
    def test_frontend_dockerfile_no_frozen_lockfile(self):
        """Frontend Dockerfile should NOT use --frozen-lockfile"""
        dockerfile_path = os.path.join(APP_ROOT, "frontend/Dockerfile.docker")
        
        with open(dockerfile_path, 'r') as f:
            content = f.read()
        
        # Should NOT have --frozen-lockfile
        assert '--frozen-lockfile' not in content, "Should not use --frozen-lockfile"
        
        # Should NOT copy yarn.lock explicitly
        lines = content.split('\n')
        for line in lines:
            if line.strip().startswith('COPY') and 'yarn.lock' in line:
                # Check if it's copying yarn.lock specifically (not as part of COPY . .)
                if 'yarn.lock' in line.split()[1:3]:  # Check source part of COPY
                    pytest.fail("Should not explicitly copy yarn.lock")
        
        print("PASS: Frontend Dockerfile does not use --frozen-lockfile")


class TestGatewayAppAuthMiddleware:
    """Verify gateway-app auth middleware configuration"""
    
    def test_auth_middleware_imports_config_correctly(self):
        """Auth middleware should import config from '../config' (not './config')"""
        auth_middleware_path = os.path.join(APP_ROOT, "services/gateway-app/src/middleware/auth.ts")
        
        with open(auth_middleware_path, 'r') as f:
            content = f.read()
        
        # Should import from '../config'
        assert "../config" in content or "'../config'" in content, "Should import config from '../config'"
        
        # Should NOT import from './config'
        import_lines = [line for line in content.split('\n') if 'import' in line and 'config' in line.lower()]
        for line in import_lines:
            if "'./config'" in line or '"./config"' in line:
                pytest.fail("Should not import config from './config'")
        
        print("PASS: Auth middleware imports config from '../config'")
    
    def test_auth_middleware_has_password_reset_routes(self):
        """Auth middleware PUBLIC_PATHS should include password-reset routes"""
        auth_middleware_path = os.path.join(APP_ROOT, "services/gateway-app/src/middleware/auth.ts")
        
        with open(auth_middleware_path, 'r') as f:
            content = f.read()
        
        # Should have password-reset routes in PUBLIC_PATHS
        assert 'password-reset' in content, "Should include password-reset routes"
        assert '/api/auth/password-reset/request' in content or 'password-reset/request' in content, \
            "Should include password-reset/request route"
        assert '/api/auth/password-reset/confirm' in content or 'password-reset/confirm' in content, \
            "Should include password-reset/confirm route"
        
        print("PASS: Auth middleware includes password-reset routes in PUBLIC_PATHS")


class TestEnvTemplate:
    """Verify .env.template exists with all required environment variables"""
    
    required_vars = [
        'JWT_SECRET',
        'JWT_ALGORITHM',
        'JWT_EXPIRATION_HOURS',
        'MONGO_URL',
        'MONGO_DB',
        'REDIS_URL',
        'CHROMA_HOST',
        'CHROMA_PORT',
        'OLLAMA_HOST',
        'OLLAMA_PORT',
        'OLLAMA_MODEL',
        'AUTH_SERVICE_URL',
        'CORE_SERVICE_URL',
        'ENTITY_SERVICE_URL',
        'PORTFOLIO_SERVICE_URL',
        'ASSETS_SERVICE_URL',
        'CORS_ORIGINS',
        'LOG_LEVEL',
    ]
    
    def test_env_template_exists(self):
        """".env.template should exist"""
        env_template_path = os.path.join(APP_ROOT, ".env.template")
        assert os.path.exists(env_template_path), ".env.template not found"
        print("PASS: .env.template exists")
    
    def test_env_template_has_required_vars(self):
        """.env.template should have all required environment variables"""
        env_template_path = os.path.join(APP_ROOT, ".env.template")
        
        with open(env_template_path, 'r') as f:
            content = f.read()
        
        missing_vars = []
        for var in self.required_vars:
            if var not in content:
                missing_vars.append(var)
        
        assert not missing_vars, f"Missing environment variables: {missing_vars}"
        print(f"PASS: All {len(self.required_vars)} required environment variables present")


class TestDockerignore:
    """Verify .dockerignore exists and excludes required patterns"""
    
    required_excludes = [
        'node_modules',
        '__pycache__',
        '.git',
        'data/',
    ]
    
    def test_dockerignore_exists(self):
        """.dockerignore should exist"""
        dockerignore_path = os.path.join(APP_ROOT, ".dockerignore")
        assert os.path.exists(dockerignore_path), ".dockerignore not found"
        print("PASS: .dockerignore exists")
    
    def test_dockerignore_has_required_excludes(self):
        """.dockerignore should exclude required patterns"""
        dockerignore_path = os.path.join(APP_ROOT, ".dockerignore")
        
        with open(dockerignore_path, 'r') as f:
            content = f.read()
        
        missing_excludes = []
        for pattern in self.required_excludes:
            # Check for pattern or variations (with ** prefix)
            if pattern not in content and f'**/{pattern}' not in content:
                missing_excludes.append(pattern)
        
        assert not missing_excludes, f"Missing .dockerignore patterns: {missing_excludes}"
        print(f"PASS: All required patterns excluded in .dockerignore")


class TestMakefile:
    """Verify Makefile has correct targets"""
    
    required_targets = [
        'up',
        'down',
        'build',
        'logs',
        'status',
        'test-api',
        'reset',
        'clean',
        'pull',
        'shell-auth',
        'shell-core',
        'shell-entity',
        'shell-portfolio',
        'shell-assets',
        'shell-gateway',
        'shell-mongo',
        'shell-redis',
    ]
    
    def test_makefile_exists(self):
        """Makefile should exist"""
        makefile_path = os.path.join(APP_ROOT, "Makefile")
        assert os.path.exists(makefile_path), "Makefile not found"
        print("PASS: Makefile exists")
    
    def test_makefile_has_required_targets(self):
        """Makefile should have all required targets"""
        makefile_path = os.path.join(APP_ROOT, "Makefile")
        
        with open(makefile_path, 'r') as f:
            content = f.read()
        
        missing_targets = []
        for target in self.required_targets:
            # Check for target definition (target:)
            pattern = rf'^{re.escape(target)}:'
            if not re.search(pattern, content, re.MULTILINE):
                missing_targets.append(target)
        
        assert not missing_targets, f"Missing Makefile targets: {missing_targets}"
        print(f"PASS: All {len(self.required_targets)} required Makefile targets present")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
