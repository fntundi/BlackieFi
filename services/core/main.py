"""
BlackieFi 3.0 - Core Service
Legacy routes, AI features, and core functionality.
"""
import sys
sys.path.insert(0, '/app/services')

from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import httpx
import logging

from shared.config import settings
from shared.database import get_db, MongoDB
from shared.auth_utils import decode_token, is_token_blacklisted
from shared.models import HealthCheck

# Configure logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BlackieFi Core Service",
    version="3.0.0",
    description="Core service with legacy routes and AI features"
)

router = APIRouter()
security = HTTPBearer(auto_error=False)


# Request/Response Models
class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    model: str


class StatusCheck(BaseModel):
    id: str
    client_name: str
    timestamp: str


class StatusCheckCreate(BaseModel):
    client_name: str


# Helper to get user from token
async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    if not credentials:
        return None
    try:
        token = credentials.credentials
        if await is_token_blacklisted(token):
            return None
        payload = decode_token(token)
        return payload.get("sub")
    except:
        return None


# Routes
@router.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint."""
    return HealthCheck(service="core", status="healthy")


@router.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Welcome to BlackieFi 3.0", "version": "3.0.0"}


# Legacy status routes (from original app)
@router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    """Create a status check (legacy)."""
    from datetime import datetime, timezone
    import uuid
    
    db = get_db()
    
    status_obj = {
        "id": str(uuid.uuid4()),
        "client_name": input.client_name,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.status_checks.insert_one(status_obj)
    return status_obj


@router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    """Get all status checks (legacy)."""
    db = get_db()
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    return status_checks


# AI Routes
@router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(request: ChatRequest, user_id: Optional[str] = Depends(get_optional_user)):
    """Chat with the AI assistant using Ollama."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Build prompt
            prompt = request.message
            if request.context:
                prompt = f"Context: {request.context}\n\nUser: {request.message}"
            
            response = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Ollama error: {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="AI service temporarily unavailable"
                )
            
            result = response.json()
            return ChatResponse(
                response=result.get("response", ""),
                model=settings.OLLAMA_MODEL
            )
    except httpx.ConnectError:
        logger.error("Cannot connect to Ollama")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service not available. Please try again later."
        )
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred processing your request"
        )


@router.get("/ai/models")
async def list_models():
    """List available AI models."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{settings.ollama_url}/api/tags")
            if response.status_code == 200:
                return response.json()
            return {"models": []}
    except:
        return {"models": [], "error": "Unable to fetch models"}


@router.get("/ai/status")
async def ai_status():
    """Check AI service status."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.ollama_url}/api/tags")
            if response.status_code == 200:
                return {"status": "available", "ollama_url": settings.ollama_url}
            return {"status": "unavailable"}
    except:
        return {"status": "unavailable", "message": "Cannot connect to Ollama"}


# Include router
app.include_router(router, prefix="/api", tags=["core"])

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    await MongoDB.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
