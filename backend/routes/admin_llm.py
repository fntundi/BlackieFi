"""
Admin routes for LLM provider management
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from database import get_db
from models import (
    LLMProviderConfig,
    LLMProviderConfigUpdate,
    LLMProviderResponse,
    LLMModelResponse,
    LLMProvidersListResponse,
    AITestRequest,
    AITestResponse,
    AIChatRequest,
)
from auth import get_current_user
from services.llm_service import LLMService, LLMProvider, get_llm_service

router = APIRouter()

async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verify user is an admin"""
    db = get_db()
    user_id = current_user.get("user_id")
    user = await db.users.find_one({"_id": user_id})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/providers", response_model=LLMProvidersListResponse)
async def get_llm_providers(current_user: dict = Depends(require_admin)):
    """Get all LLM providers and their configuration status"""
    db = get_db()
    
    # Get system settings
    system_settings = await db.system_settings.find_one({"_id": "system"})
    active_provider = system_settings.get("default_llm_provider", "emergent") if system_settings else "emergent"
    system_ai_enabled = system_settings.get("ai_enabled", False) if system_settings else False
    
    # Get provider configs from database
    provider_configs = {}
    async for config in db.llm_providers.find():
        provider_configs[config["provider"]] = config
    
    # Build response with all available providers
    providers = []
    for provider_info in LLMService.get_available_providers():
        provider_id = provider_info["id"]
        db_config = provider_configs.get(provider_id, {})
        
        providers.append(LLMProviderResponse(
            id=provider_id,
            name=provider_info["name"],
            enabled=db_config.get("enabled", False),
            has_api_key=bool(db_config.get("api_key")),
            default_model=db_config.get("default_model") or provider_info.get("default_model"),
            base_url=db_config.get("base_url"),
            requires_api_key=provider_info.get("requires_api_key", True),
            is_local=provider_info.get("is_local", False),
        ))
    
    return LLMProvidersListResponse(
        providers=providers,
        active_provider=active_provider,
        system_ai_enabled=system_ai_enabled
    )


@router.get("/providers/{provider}/models", response_model=List[LLMModelResponse])
async def get_provider_models(provider: str, current_user: dict = Depends(get_current_user)):
    """Get available models for a specific provider"""
    models = LLMService.get_models_for_provider(provider)
    return [LLMModelResponse(**m) for m in models]


@router.put("/providers/{provider}")
async def update_provider_config(
    provider: str,
    config: LLMProviderConfigUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update configuration for a specific LLM provider"""
    db = get_db()
    
    # Validate provider
    valid_providers = [p.value for p in LLMProvider]
    if provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {valid_providers}")
    
    update_data = {"provider": provider, "updated_at": datetime.now(timezone.utc).isoformat()}
    
    if config.enabled is not None:
        update_data["enabled"] = config.enabled
    if config.api_key is not None:
        update_data["api_key"] = config.api_key
    if config.default_model is not None:
        update_data["default_model"] = config.default_model
    if config.base_url is not None:
        update_data["base_url"] = config.base_url
    
    await db.llm_providers.update_one(
        {"provider": provider},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True, "message": f"Provider {provider} configuration updated"}


@router.post("/providers/{provider}/set-active")
async def set_active_provider(provider: str, current_user: dict = Depends(require_admin)):
    """Set the active/default LLM provider for the system"""
    db = get_db()
    
    # Validate provider
    valid_providers = [p.value for p in LLMProvider]
    if provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {valid_providers}")
    
    # Check if provider is enabled
    provider_config = await db.llm_providers.find_one({"provider": provider})
    if not provider_config or not provider_config.get("enabled", False):
        raise HTTPException(status_code=400, detail=f"Provider {provider} must be enabled first")
    
    # Update system settings
    await db.system_settings.update_one(
        {"_id": "system"},
        {
            "$set": {
                "default_llm_provider": provider,
                "default_model": provider_config.get("default_model"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": f"Active provider set to {provider}"}


@router.post("/test", response_model=AITestResponse)
async def test_provider(request: AITestRequest, current_user: dict = Depends(require_admin)):
    """Test if a provider is working correctly"""
    db = get_db()
    
    try:
        # Get provider config from database
        provider_config = await db.llm_providers.find_one({"provider": request.provider})
        
        # Set up environment for the test
        import os
        if provider_config and provider_config.get("api_key"):
            provider_info = next(
                (p for p in LLMService.get_available_providers() if p["id"] == request.provider),
                None
            )
            if provider_info and provider_info.get("env_key_name"):
                os.environ[provider_info["env_key_name"]] = provider_config["api_key"]
        
        # Create service and test
        model = provider_config.get("default_model") if provider_config else None
        base_url = provider_config.get("base_url") if provider_config else None
        service = get_llm_service(provider=request.provider, model=model, base_url=base_url)
        
        response = await service.chat(
            messages=[{"role": "user", "content": request.prompt}],
            system_message="You are a test assistant. Follow instructions exactly."
        )
        
        return AITestResponse(
            success=True,
            provider=request.provider,
            response=response[:200],
            message=f"{request.provider} is working correctly"
        )
        
    except Exception as e:
        return AITestResponse(
            success=False,
            provider=request.provider,
            error=str(e),
            message=f"Failed to test {request.provider}: {str(e)}"
        )


@router.post("/chat")
async def ai_chat(request: AIChatRequest, current_user: dict = Depends(get_current_user)):
    """Send a message to the AI assistant"""
    db = get_db()
    user_id = current_user.get("user_id")
    
    # Check if AI is enabled
    system_settings = await db.system_settings.find_one({"_id": "system"})
    if not system_settings or not system_settings.get("ai_enabled", False):
        raise HTTPException(status_code=403, detail="AI features are disabled system-wide")
    
    user = await db.users.find_one({"_id": user_id})
    if not user or not user.get("ai_enabled", False):
        raise HTTPException(status_code=403, detail="AI features are disabled for your account")
    
    # Get provider configuration
    provider = user.get("preferred_llm_provider") or system_settings.get("default_llm_provider", "emergent")
    provider_config = await db.llm_providers.find_one({"provider": provider})
    
    # Set API key in environment if available
    import os
    if provider_config and provider_config.get("api_key"):
        provider_info = next(
            (p for p in LLMService.get_available_providers() if p["id"] == provider),
            None
        )
        if provider_info and provider_info.get("env_key_name"):
            os.environ[provider_info["env_key_name"]] = provider_config["api_key"]
    
    # Build system message based on feature
    system_messages = {
        "general": "You are BlackieFi, a premium financial AI assistant. Help users with financial questions, budgeting advice, and money management tips. Be concise and helpful.",
        "insights": "You are a financial analyst AI. Analyze the provided financial data and give actionable insights. Focus on spending patterns, savings opportunities, and financial health.",
        "categorization": "You are a transaction categorization AI. Categorize transactions accurately based on their descriptions. Return only the category name.",
        "budgeting": "You are a budget planning AI. Help users create and optimize their budgets based on their income, expenses, and financial goals."
    }
    system_message = system_messages.get(request.feature, system_messages["general"])
    
    # Add context if provided
    if request.context:
        system_message += f"\n\nContext: {request.context}"
    
    try:
        model = provider_config.get("default_model") if provider_config else None
        base_url = provider_config.get("base_url") if provider_config else None
        service = get_llm_service(provider=provider, model=model, base_url=base_url)
        
        response = await service.chat(
            messages=[{"role": "user", "content": request.message}],
            system_message=system_message,
            session_id=f"user_{user_id}"
        )
        
        return {
            "success": True,
            "response": response,
            "provider": provider
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
