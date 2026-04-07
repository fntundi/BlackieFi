"""
BlackieFi 3.0 - Shared Configuration Module
This module provides centralized configuration management for all Python services.
"""
import os
from pathlib import Path
from functools import lru_cache
from typing import Optional
import shutil


def ensure_env_file():
    """Ensure .env file exists by copying from template if missing."""
    root_dir = Path(__file__).parent.parent.parent
    env_file = root_dir / '.env'
    template_file = root_dir / '.env.template'
    
    if not env_file.exists() and template_file.exists():
        shutil.copy(template_file, env_file)
        print(f"Created .env from .env.template")
    
    # Load environment variables from .env
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, value = line.partition('=')
                    key = key.strip()
                    value = value.strip()
                    if key and key not in os.environ:
                        os.environ[key] = value


# Ensure .env exists on import
ensure_env_file()


class Settings:
    """Application settings loaded from environment variables."""
    
    # JWT Configuration
    JWT_SECRET: str = os.getenv('JWT_SECRET', 'blackiefi-super-secret-key-change-in-production')
    JWT_ALGORITHM: str = os.getenv('JWT_ALGORITHM', 'HS256')
    JWT_EXPIRATION_HOURS: int = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))
    
    # MongoDB Configuration
    MONGO_URL: str = os.getenv('MONGO_URL', 'mongodb://mongo:27017')
    MONGO_DB: str = os.getenv('MONGO_DB', 'blackiefi')
    
    # Redis Configuration
    REDIS_URL: str = os.getenv('REDIS_URL', 'redis://redis:6379')
    REDIS_PASSWORD: Optional[str] = os.getenv('REDIS_PASSWORD', None)
    
    # ChromaDB Configuration
    CHROMA_HOST: str = os.getenv('CHROMA_HOST', 'chroma')
    CHROMA_PORT: int = int(os.getenv('CHROMA_PORT', '8000'))
    
    # Ollama Configuration
    OLLAMA_HOST: str = os.getenv('OLLAMA_HOST', 'ollama')
    OLLAMA_PORT: int = int(os.getenv('OLLAMA_PORT', '11434'))
    OLLAMA_MODEL: str = os.getenv('OLLAMA_MODEL', 'phi')
    
    # Service URLs
    AUTH_SERVICE_URL: str = os.getenv('AUTH_SERVICE_URL', 'http://auth:8001')
    CORE_SERVICE_URL: str = os.getenv('CORE_SERVICE_URL', 'http://core:8002')
    ENTITY_SERVICE_URL: str = os.getenv('ENTITY_SERVICE_URL', 'http://entity:8003')
    PORTFOLIO_SERVICE_URL: str = os.getenv('PORTFOLIO_SERVICE_URL', 'http://portfolio:8004')
    ASSETS_SERVICE_URL: str = os.getenv('ASSETS_SERVICE_URL', 'http://assets:8005')
    
    # CORS
    CORS_ORIGINS: list = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:8080').split(',')
    
    # Logging
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    
    @property
    def ollama_url(self) -> str:
        return f"http://{self.OLLAMA_HOST}:{self.OLLAMA_PORT}"
    
    @property
    def chroma_url(self) -> str:
        return f"http://{self.CHROMA_HOST}:{self.CHROMA_PORT}"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
