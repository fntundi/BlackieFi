"""
BlackieFi API Gateway
Centralized entry point for all API requests with:
- TLS termination (in production)
- Authentication enforcement
- Rate limiting
- Request routing
- Request/Response logging
- CORS handling
"""
import os
import time
import uuid
import httpx
from datetime import datetime, timezone
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import redis.asyncio as redis
from jose import JWTError, jwt

# Configuration
SERVICE_NAME = os.environ.get("SERVICE_NAME", "gateway")
PORT = int(os.environ.get("PORT", 8080))
AUTH_SERVICE_URL = os.environ.get("AUTH_SERVICE_URL", "http://auth-service:8001")
CORE_SERVICE_URL = os.environ.get("CORE_SERVICE_URL", "http://core-service:8002")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
JWT_SECRET = os.environ.get("JWT_SECRET", "blackiefi-super-secret-jwt-key-change-in-production")
JWT_ALGORITHM = "HS256"
RATE_LIMIT_REQUESTS = int(os.environ.get("RATE_LIMIT_REQUESTS", 100))
RATE_LIMIT_WINDOW = int(os.environ.get("RATE_LIMIT_WINDOW", 60))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

# Service routing configuration
SERVICE_ROUTES = {
    # Auth service routes
    "/api/v1/auth": AUTH_SERVICE_URL,
    "/api/auth": AUTH_SERVICE_URL,  # Legacy support
    
    # Core service routes (everything else)
    "/api/v1": CORE_SERVICE_URL,
    "/api": CORE_SERVICE_URL,  # Legacy support
}

# Public routes that don't require authentication
PUBLIC_ROUTES = [
    "/health",
    "/api/health",
    "/api/v1/health",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/forgot-password",
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/api/v1/auth/forgot-password",
]

# Redis client
redis_client: Optional[redis.Redis] = None

# HTTP client for proxying
http_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global redis_client, http_client
    
    # Startup
    print(f"[{SERVICE_NAME}] Starting API Gateway...")
    
    # Initialize Redis
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
        print(f"[{SERVICE_NAME}] Connected to Redis")
    except Exception as e:
        print(f"[{SERVICE_NAME}] Warning: Redis connection failed: {e}")
        redis_client = None
    
    # Initialize HTTP client
    http_client = httpx.AsyncClient(timeout=30.0)
    print(f"[{SERVICE_NAME}] HTTP client initialized")
    
    print(f"[{SERVICE_NAME}] API Gateway ready on port {PORT}")
    
    yield
    
    # Shutdown
    print(f"[{SERVICE_NAME}] Shutting down...")
    if redis_client:
        await redis_client.close()
    if http_client:
        await http_client.aclose()


app = FastAPI(
    title="BlackieFi API Gateway",
    description="Institutional-Grade API Gateway for BlackieFi Platform",
    version="3.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# MIDDLEWARE
# =============================================================================

@app.middleware("http")
async def request_middleware(request: Request, call_next):
    """
    Main middleware for:
    - Request ID generation
    - Timing
    - Logging
    """
    # Generate request ID
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    request.state.start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Add headers
    process_time = time.time() - request.state.start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    
    # Log request (simplified for now)
    if LOG_LEVEL == "DEBUG":
        print(f"[{request_id}] {request.method} {request.url.path} -> {response.status_code} ({process_time:.4f}s)")
    
    return response


# =============================================================================
# RATE LIMITING
# =============================================================================

async def check_rate_limit(client_ip: str) -> bool:
    """Check if client has exceeded rate limit"""
    if not redis_client:
        return True  # Allow if Redis is unavailable
    
    key = f"rate_limit:{client_ip}"
    try:
        current = await redis_client.get(key)
        if current is None:
            await redis_client.setex(key, RATE_LIMIT_WINDOW, 1)
            return True
        elif int(current) < RATE_LIMIT_REQUESTS:
            await redis_client.incr(key)
            return True
        else:
            return False
    except Exception:
        return True  # Allow on Redis errors


# =============================================================================
# AUTHENTICATION
# =============================================================================

def verify_token(token: str) -> dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def is_public_route(path: str) -> bool:
    """Check if route is public (no auth required)"""
    for public_route in PUBLIC_ROUTES:
        if path.startswith(public_route):
            return True
    return False


def get_service_url(path: str) -> str:
    """Determine which service should handle the request"""
    for route_prefix, service_url in SERVICE_ROUTES.items():
        if path.startswith(route_prefix):
            return service_url
    return CORE_SERVICE_URL


# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/health")
async def health_check():
    """Gateway health check"""
    redis_status = "connected"
    if redis_client:
        try:
            await redis_client.ping()
        except Exception:
            redis_status = "disconnected"
    else:
        redis_status = "not_configured"
    
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "version": "3.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": {
            "redis": redis_status
        }
    }


@app.get("/api/health")
async def api_health():
    """API health endpoint for legacy compatibility"""
    return await health_check()


# =============================================================================
# PROXY HANDLER - Routes all /api/* requests
# =============================================================================

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_request(request: Request, path: str):
    """
    Proxy all API requests to appropriate backend services
    with authentication, rate limiting, and logging
    """
    full_path = f"/api/{path}"
    
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    # Rate limiting
    if not await check_rate_limit(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": str(RATE_LIMIT_WINDOW)}
        )
    
    # Authentication check
    auth_header = request.headers.get("Authorization")
    user_payload = None
    
    if not is_public_route(full_path):
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = auth_header.split(" ")[1]
        user_payload = verify_token(token)
    
    # Determine target service
    service_url = get_service_url(full_path)
    
    # Build target URL
    target_url = f"{service_url}{full_path}"
    
    # Add query string if present
    if request.url.query:
        target_url = f"{target_url}?{request.url.query}"
    
    # Prepare headers for downstream service
    headers = dict(request.headers)
    headers.pop("host", None)
    headers["X-Request-ID"] = getattr(request.state, "request_id", str(uuid.uuid4()))
    headers["X-Forwarded-For"] = client_ip
    headers["X-Gateway-Service"] = SERVICE_NAME
    
    # Add user context if authenticated
    if user_payload:
        headers["X-User-ID"] = str(user_payload.get("user_id", ""))
        headers["X-User-Role"] = str(user_payload.get("role", "user"))
    
    # Get request body
    body = await request.body()
    
    try:
        # Forward request to backend service
        response = await http_client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body,
        )
        
        # Build response
        excluded_headers = {"content-encoding", "content-length", "transfer-encoding", "connection"}
        response_headers = {
            k: v for k, v in response.headers.items()
            if k.lower() not in excluded_headers
        }
        
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=response_headers,
            media_type=response.headers.get("content-type")
        )
        
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Backend service unavailable"
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Backend service timeout"
        )
    except Exception as e:
        print(f"[{SERVICE_NAME}] Proxy error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gateway error"
        )


# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exception handler with consistent format"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "request_id": getattr(request.state, "request_id", None),
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        headers=exc.headers
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """General exception handler"""
    print(f"[{SERVICE_NAME}] Unhandled error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "status_code": 500,
            "request_id": getattr(request.state, "request_id", None),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
