"""
BlackieFi Shared Configuration Module
Provides centralized configuration management with secrets handling.
"""
import os
from typing import Optional, Dict, Any
from pydantic import BaseSettings, Field
from functools import lru_cache


class ServiceConfig(BaseSettings):
    """Base service configuration"""
    
    # Service Identity
    service_name: str = Field(default="blackiefi-service", env="SERVICE_NAME")
    service_version: str = "3.0.0"
    environment: str = Field(default="development", env="ENVIRONMENT")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # Database
    mongo_url: str = Field(default="mongodb://localhost:27017/blackiefi", env="MONGO_URL")
    db_name: str = Field(default="blackiefi", env="DB_NAME")
    
    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    
    # JWT
    jwt_secret: str = Field(default="change-in-production", env="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    jwt_access_expiry_hours: int = Field(default=24, env="JWT_ACCESS_EXPIRY_HOURS")
    jwt_refresh_expiry_days: int = Field(default=30, env="JWT_REFRESH_EXPIRY_DAYS")
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(default=60, env="RATE_LIMIT_WINDOW")
    
    # CORS
    cors_origins: str = Field(default="*", env="CORS_ORIGINS")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


class GatewayConfig(ServiceConfig):
    """Gateway-specific configuration"""
    service_name: str = "gateway"
    port: int = Field(default=8080, env="PORT")
    auth_service_url: str = Field(default="http://auth-service:8001", env="AUTH_SERVICE_URL")
    core_service_url: str = Field(default="http://core-service:8002", env="CORE_SERVICE_URL")


class AuthConfig(ServiceConfig):
    """Auth service-specific configuration"""
    service_name: str = "auth-service"
    port: int = Field(default=8001, env="PORT")
    mfa_issuer: str = Field(default="BlackieFi", env="MFA_ISSUER")


class CoreConfig(ServiceConfig):
    """Core service-specific configuration"""
    service_name: str = "core-service"
    port: int = Field(default=8002, env="PORT")
    auth_service_url: str = Field(default="http://auth-service:8001", env="AUTH_SERVICE_URL")
    
    # LLM Providers
    emergent_llm_key: str = Field(default="", env="EMERGENT_LLM_KEY")
    openrouter_api_key: str = Field(default="", env="OPENROUTER_API_KEY")
    default_llm_provider: str = Field(default="emergent", env="DEFAULT_LLM_PROVIDER")
    
    # ChromaDB
    chromadb_url: str = Field(default="http://localhost:8000", env="CHROMADB_URL")
    chromadb_auth_token: str = Field(default="", env="CHROMADB_AUTH_TOKEN")
    
    # Market Data APIs
    alpha_vantage_api_key: str = Field(default="", env="ALPHA_VANTAGE_API_KEY")
    coingecko_api_key: str = Field(default="", env="COINGECKO_API_KEY")


@lru_cache()
def get_gateway_config() -> GatewayConfig:
    return GatewayConfig()


@lru_cache()
def get_auth_config() -> AuthConfig:
    return AuthConfig()


@lru_cache()
def get_core_config() -> CoreConfig:
    return CoreConfig()


class SecretsManager:
    """
    Simple secrets manager for development.
    In production, this would integrate with:
    - HashiCorp Vault
    - AWS Secrets Manager
    - Azure Key Vault
    - GCP Secret Manager
    """
    
    _instance: Optional['SecretsManager'] = None
    _secrets: Dict[str, str] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_secrets()
        return cls._instance
    
    def _load_secrets(self):
        """Load secrets from environment or external source"""
        # In development, load from environment
        secret_keys = [
            "JWT_SECRET",
            "MONGO_ROOT_PASSWORD",
            "REDIS_PASSWORD",
            "EMERGENT_LLM_KEY",
            "OPENROUTER_API_KEY",
            "ALPHA_VANTAGE_API_KEY",
            "COINGECKO_API_KEY",
            "CHROMADB_AUTH_TOKEN",
            "RESEND_API_KEY",
        ]
        
        for key in secret_keys:
            value = os.environ.get(key)
            if value:
                self._secrets[key] = value
    
    def get_secret(self, key: str, default: str = "") -> str:
        """Get a secret value"""
        return self._secrets.get(key, os.environ.get(key, default))
    
    def set_secret(self, key: str, value: str):
        """Set a secret value (for testing)"""
        self._secrets[key] = value
    
    def has_secret(self, key: str) -> bool:
        """Check if a secret exists"""
        return key in self._secrets or key in os.environ


def get_secrets_manager() -> SecretsManager:
    return SecretsManager()
