"""
Observability Middleware - Request tracking and metrics collection
Part of BlackieFi 3.0 Phase 4: Institutional Hardening
"""
import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from services.metrics_service import get_metrics_service


class MetricsMiddleware(BaseHTTPMiddleware):
    """
    Middleware for automatic request metrics collection.
    Tracks request count, latency, and in-progress requests.
    """
    
    # Endpoints to exclude from metrics (health checks, metrics endpoint itself)
    EXCLUDED_PATHS = {"/metrics", "/api/health", "/health", "/favicon.ico"}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip excluded paths
        if request.url.path in self.EXCLUDED_PATHS:
            return await call_next(request)
        
        metrics = get_metrics_service()
        method = request.method
        endpoint = request.url.path
        
        # Add correlation ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        
        # Track in-progress
        in_progress = metrics.request_in_progress(method, endpoint)
        in_progress.inc()
        
        start_time = time.time()
        
        try:
            response = await call_next(request)
            status_code = response.status_code
            
            # Add request ID to response
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            status_code = 500
            raise
            
        finally:
            duration = time.time() - start_time
            in_progress.dec()
            
            # Record metrics
            metrics.record_request(method, endpoint, status_code, duration)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add request context (ID, timing) for downstream use.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate or use existing request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start_time = time.time()
        
        # Store in request state for access in routes
        request.state.request_id = request_id
        request.state.start_time = start_time
        
        response = await call_next(request)
        
        # Add timing header
        duration = time.time() - start_time
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration:.3f}s"
        
        return response


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, handling proxies"""
    # Check for forwarded headers (when behind proxy/load balancer)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Direct connection
    if request.client:
        return request.client.host
    
    return "unknown"


def get_user_agent(request: Request) -> str:
    """Extract user agent from request"""
    return request.headers.get("User-Agent", "unknown")
