"""
Prometheus Metrics Service - Observability Stack
Provides metrics collection for monitoring and alerting.
Part of BlackieFi 3.0 Phase 4: Institutional Hardening
"""
import time
from typing import Optional, Dict, Any, Callable
from functools import wraps
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Info,
    REGISTRY,
    generate_latest,
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
)


# =============================================================================
# METRICS DEFINITIONS
# =============================================================================

# Request Metrics
REQUEST_COUNT = Counter(
    "blackiefi_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"]
)

REQUEST_LATENCY = Histogram(
    "blackiefi_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=(0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0)
)

REQUEST_IN_PROGRESS = Gauge(
    "blackiefi_http_requests_in_progress",
    "Number of HTTP requests currently being processed",
    ["method", "endpoint"]
)

# Authentication Metrics
AUTH_ATTEMPTS = Counter(
    "blackiefi_auth_attempts_total",
    "Total authentication attempts",
    ["type", "success"]  # type: login, logout, mfa_verify, token_refresh
)

ACTIVE_SESSIONS = Gauge(
    "blackiefi_active_sessions",
    "Number of active user sessions"
)

# Database Metrics
DB_OPERATIONS = Counter(
    "blackiefi_db_operations_total",
    "Total database operations",
    ["operation", "collection", "success"]  # operation: find, insert, update, delete
)

DB_OPERATION_LATENCY = Histogram(
    "blackiefi_db_operation_duration_seconds",
    "Database operation latency in seconds",
    ["operation", "collection"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0)
)

# AI/LLM Metrics
LLM_REQUESTS = Counter(
    "blackiefi_llm_requests_total",
    "Total LLM API requests",
    ["provider", "model", "success"]
)

LLM_LATENCY = Histogram(
    "blackiefi_llm_request_duration_seconds",
    "LLM API request latency in seconds",
    ["provider", "model"],
    buckets=(0.5, 1.0, 2.5, 5.0, 7.5, 10.0, 15.0, 30.0, 60.0)
)

LLM_TOKENS = Counter(
    "blackiefi_llm_tokens_total",
    "Total LLM tokens used",
    ["provider", "model", "type"]  # type: prompt, completion
)

# Business Metrics
ENTITIES_TOTAL = Gauge(
    "blackiefi_entities_total",
    "Total number of entities",
    ["type"]  # LLC, LP, Trust, Personal, Corporation
)

TRANSACTIONS_TOTAL = Gauge(
    "blackiefi_transactions_total",
    "Total number of transactions",
    ["type"]  # income, expense, transfer
)

PORTFOLIO_VALUE = Gauge(
    "blackiefi_portfolio_value_dollars",
    "Total portfolio value in dollars",
    ["entity_id"]
)

# Error Metrics
ERROR_COUNT = Counter(
    "blackiefi_errors_total",
    "Total application errors",
    ["type", "location"]  # type: validation, auth, db, llm, internal
)

# Rate Limiting Metrics
RATE_LIMIT_HITS = Counter(
    "blackiefi_rate_limit_hits_total",
    "Total rate limit violations",
    ["endpoint", "ip_prefix"]  # ip_prefix: first 2 octets for privacy
)

# Cache Metrics
CACHE_HITS = Counter(
    "blackiefi_cache_hits_total",
    "Total cache hits",
    ["cache_type"]  # redis, memory
)

CACHE_MISSES = Counter(
    "blackiefi_cache_misses_total",
    "Total cache misses",
    ["cache_type"]
)

# Service Info
SERVICE_INFO = Info(
    "blackiefi_service",
    "Service information"
)


# =============================================================================
# METRICS SERVICE CLASS
# =============================================================================

class MetricsService:
    """
    Centralized metrics collection service.
    Provides easy-to-use methods for recording metrics.
    """
    
    def __init__(self):
        self._initialized = False
        
    def initialize(self, service_name: str, version: str):
        """Initialize service metrics"""
        if not self._initialized:
            SERVICE_INFO.info({
                "service": service_name,
                "version": version,
            })
            self._initialized = True
    
    # -------------------------------------------------------------------------
    # Request Metrics
    # -------------------------------------------------------------------------
    
    def record_request(
        self,
        method: str,
        endpoint: str,
        status_code: int,
        duration: float,
    ):
        """Record HTTP request metrics"""
        # Normalize endpoint (remove IDs)
        normalized = self._normalize_endpoint(endpoint)
        
        REQUEST_COUNT.labels(
            method=method,
            endpoint=normalized,
            status_code=str(status_code)
        ).inc()
        
        REQUEST_LATENCY.labels(
            method=method,
            endpoint=normalized
        ).observe(duration)
    
    def request_in_progress(self, method: str, endpoint: str):
        """Context manager for tracking in-progress requests"""
        normalized = self._normalize_endpoint(endpoint)
        return REQUEST_IN_PROGRESS.labels(method=method, endpoint=normalized)
    
    # -------------------------------------------------------------------------
    # Auth Metrics
    # -------------------------------------------------------------------------
    
    def record_auth_attempt(self, auth_type: str, success: bool):
        """Record authentication attempt"""
        AUTH_ATTEMPTS.labels(
            type=auth_type,
            success=str(success).lower()
        ).inc()
    
    def set_active_sessions(self, count: int):
        """Update active session count"""
        ACTIVE_SESSIONS.set(count)
    
    # -------------------------------------------------------------------------
    # Database Metrics
    # -------------------------------------------------------------------------
    
    def record_db_operation(
        self,
        operation: str,
        collection: str,
        success: bool,
        duration: float,
    ):
        """Record database operation metrics"""
        DB_OPERATIONS.labels(
            operation=operation,
            collection=collection,
            success=str(success).lower()
        ).inc()
        
        DB_OPERATION_LATENCY.labels(
            operation=operation,
            collection=collection
        ).observe(duration)
    
    # -------------------------------------------------------------------------
    # LLM Metrics
    # -------------------------------------------------------------------------
    
    def record_llm_request(
        self,
        provider: str,
        model: str,
        success: bool,
        duration: float,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
    ):
        """Record LLM API request metrics"""
        LLM_REQUESTS.labels(
            provider=provider,
            model=model,
            success=str(success).lower()
        ).inc()
        
        LLM_LATENCY.labels(
            provider=provider,
            model=model
        ).observe(duration)
        
        if prompt_tokens > 0:
            LLM_TOKENS.labels(
                provider=provider,
                model=model,
                type="prompt"
            ).inc(prompt_tokens)
        
        if completion_tokens > 0:
            LLM_TOKENS.labels(
                provider=provider,
                model=model,
                type="completion"
            ).inc(completion_tokens)
    
    # -------------------------------------------------------------------------
    # Business Metrics
    # -------------------------------------------------------------------------
    
    def set_entity_count(self, entity_type: str, count: int):
        """Update entity count"""
        ENTITIES_TOTAL.labels(type=entity_type).set(count)
    
    def set_transaction_count(self, tx_type: str, count: int):
        """Update transaction count"""
        TRANSACTIONS_TOTAL.labels(type=tx_type).set(count)
    
    def set_portfolio_value(self, entity_id: str, value: float):
        """Update portfolio value"""
        PORTFOLIO_VALUE.labels(entity_id=entity_id).set(value)
    
    # -------------------------------------------------------------------------
    # Error Metrics
    # -------------------------------------------------------------------------
    
    def record_error(self, error_type: str, location: str):
        """Record application error"""
        ERROR_COUNT.labels(type=error_type, location=location).inc()
    
    # -------------------------------------------------------------------------
    # Rate Limiting Metrics
    # -------------------------------------------------------------------------
    
    def record_rate_limit_hit(self, endpoint: str, ip_address: str):
        """Record rate limit violation"""
        # Use first 2 octets for privacy
        ip_prefix = ".".join(ip_address.split(".")[:2]) + ".x.x" if ip_address else "unknown"
        RATE_LIMIT_HITS.labels(endpoint=endpoint, ip_prefix=ip_prefix).inc()
    
    # -------------------------------------------------------------------------
    # Cache Metrics
    # -------------------------------------------------------------------------
    
    def record_cache_hit(self, cache_type: str = "redis"):
        """Record cache hit"""
        CACHE_HITS.labels(cache_type=cache_type).inc()
    
    def record_cache_miss(self, cache_type: str = "redis"):
        """Record cache miss"""
        CACHE_MISSES.labels(cache_type=cache_type).inc()
    
    # -------------------------------------------------------------------------
    # Utilities
    # -------------------------------------------------------------------------
    
    def _normalize_endpoint(self, endpoint: str) -> str:
        """Normalize endpoint by replacing IDs with placeholders"""
        import re
        # Replace UUIDs
        endpoint = re.sub(
            r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
            '{id}',
            endpoint,
            flags=re.IGNORECASE
        )
        # Replace ObjectIds (24 hex chars)
        endpoint = re.sub(r'[0-9a-f]{24}', '{id}', endpoint, flags=re.IGNORECASE)
        # Replace numeric IDs
        endpoint = re.sub(r'/\d+(?=/|$)', '/{id}', endpoint)
        return endpoint
    
    def get_metrics(self) -> bytes:
        """Get all metrics in Prometheus format"""
        return generate_latest(REGISTRY)
    
    def get_content_type(self) -> str:
        """Get Prometheus content type"""
        return CONTENT_TYPE_LATEST


# Singleton instance
_metrics_service: Optional[MetricsService] = None


def get_metrics_service() -> MetricsService:
    """Get or create metrics service instance"""
    global _metrics_service
    if _metrics_service is None:
        _metrics_service = MetricsService()
    return _metrics_service


# =============================================================================
# DECORATORS
# =============================================================================

def track_request_metrics(func: Callable) -> Callable:
    """Decorator to automatically track request metrics"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        metrics = get_metrics_service()
        start_time = time.time()
        
        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            duration = time.time() - start_time
            # Note: Endpoint and status code would need to be extracted
            # from the request/response context
    
    return wrapper


def track_db_operation(operation: str, collection: str):
    """Decorator to track database operation metrics"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            metrics = get_metrics_service()
            start_time = time.time()
            success = True
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                raise
            finally:
                duration = time.time() - start_time
                metrics.record_db_operation(operation, collection, success, duration)
        
        return wrapper
    return decorator


def track_llm_request(provider: str, model: str):
    """Decorator to track LLM request metrics"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            metrics = get_metrics_service()
            start_time = time.time()
            success = True
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                raise
            finally:
                duration = time.time() - start_time
                metrics.record_llm_request(provider, model, success, duration)
        
        return wrapper
    return decorator
