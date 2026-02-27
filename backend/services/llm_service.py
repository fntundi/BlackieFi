"""
Multi-LLM Service - Supports OpenRouter, Emergent LLM, and Ollama
"""
import os
import httpx
from typing import Optional, List, Dict, Any
from enum import Enum
from dotenv import load_dotenv

load_dotenv()

class LLMProvider(str, Enum):
    OPENROUTER = "openrouter"
    EMERGENT = "emergent"
    OLLAMA = "ollama"

class LLMService:
    """
    Unified LLM service that routes requests to different providers
    based on configuration.
    """
    
    # Provider-specific configurations
    PROVIDER_CONFIGS = {
        LLMProvider.OPENROUTER: {
            "base_url": "https://openrouter.ai/api/v1",
            "default_model": "anthropic/claude-3.5-sonnet",
            "env_key": "OPENROUTER_API_KEY",
        },
        LLMProvider.EMERGENT: {
            "base_url": None,  # Uses emergentintegrations library
            "default_model": "gpt-5.2",
            "env_key": "EMERGENT_LLM_KEY",
        },
        LLMProvider.OLLAMA: {
            "base_url": "http://localhost:11434",
            "default_model": "llama3.2",
            "env_key": None,  # Ollama doesn't need API key for local
        },
    }
    
    # Available models per provider
    AVAILABLE_MODELS = {
        LLMProvider.OPENROUTER: [
            {"id": "anthropic/claude-3.5-sonnet", "name": "Claude 3.5 Sonnet"},
            {"id": "anthropic/claude-3-opus", "name": "Claude 3 Opus"},
            {"id": "openai/gpt-4o", "name": "GPT-4o"},
            {"id": "openai/gpt-4-turbo", "name": "GPT-4 Turbo"},
            {"id": "google/gemini-pro", "name": "Gemini Pro"},
            {"id": "meta-llama/llama-3.1-70b-instruct", "name": "Llama 3.1 70B"},
            {"id": "mistralai/mixtral-8x7b-instruct", "name": "Mixtral 8x7B"},
        ],
        LLMProvider.EMERGENT: [
            {"id": "gpt-5.2", "name": "GPT-5.2 (OpenAI)", "provider": "openai"},
            {"id": "gpt-5.1", "name": "GPT-5.1 (OpenAI)", "provider": "openai"},
            {"id": "gpt-4o", "name": "GPT-4o (OpenAI)", "provider": "openai"},
            {"id": "claude-sonnet-4-5-20250929", "name": "Claude Sonnet 4.5", "provider": "anthropic"},
            {"id": "claude-4-sonnet-20250514", "name": "Claude 4 Sonnet", "provider": "anthropic"},
            {"id": "gemini-3-flash-preview", "name": "Gemini 3 Flash", "provider": "gemini"},
            {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", "provider": "gemini"},
        ],
        LLMProvider.OLLAMA: [
            {"id": "llama3.2", "name": "Llama 3.2"},
            {"id": "llama3.1", "name": "Llama 3.1"},
            {"id": "mistral", "name": "Mistral"},
            {"id": "codellama", "name": "Code Llama"},
            {"id": "phi3", "name": "Phi-3"},
            {"id": "gemma2", "name": "Gemma 2"},
        ],
    }
    
    def __init__(self, provider: LLMProvider = LLMProvider.EMERGENT, model: Optional[str] = None):
        self.provider = provider
        self.model = model or self.PROVIDER_CONFIGS[provider]["default_model"]
        self._client = None
        
    def _get_api_key(self) -> Optional[str]:
        """Get API key for current provider from environment"""
        env_key = self.PROVIDER_CONFIGS[self.provider].get("env_key")
        if env_key:
            return os.environ.get(env_key)
        return None
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        system_message: Optional[str] = None,
        session_id: str = "default",
        **kwargs
    ) -> str:
        """
        Send chat messages to the configured LLM provider.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            system_message: Optional system message to prepend
            session_id: Session identifier for conversation tracking
            
        Returns:
            Response text from the LLM
        """
        if self.provider == LLMProvider.EMERGENT:
            return await self._chat_emergent(messages, system_message, session_id, **kwargs)
        elif self.provider == LLMProvider.OPENROUTER:
            return await self._chat_openrouter(messages, system_message, **kwargs)
        elif self.provider == LLMProvider.OLLAMA:
            return await self._chat_ollama(messages, system_message, **kwargs)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")
    
    async def _chat_emergent(
        self,
        messages: List[Dict[str, str]],
        system_message: Optional[str],
        session_id: str,
        **kwargs
    ) -> str:
        """Chat using Emergent LLM integration"""
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            api_key = self._get_api_key()
            if not api_key:
                raise ValueError("EMERGENT_LLM_KEY not configured")
            
            # Determine provider and model from model string
            model_info = next(
                (m for m in self.AVAILABLE_MODELS[LLMProvider.EMERGENT] if m["id"] == self.model),
                None
            )
            provider = model_info.get("provider", "openai") if model_info else "openai"
            
            chat = LlmChat(
                api_key=api_key,
                session_id=session_id,
                system_message=system_message or "You are a helpful financial assistant."
            ).with_model(provider, self.model)
            
            # Get the last user message
            last_message = messages[-1]["content"] if messages else ""
            user_message = UserMessage(text=last_message)
            
            response = await chat.send_message(user_message)
            return response
            
        except ImportError:
            raise ImportError("emergentintegrations library not installed. Run: pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/")
    
    async def _chat_openrouter(
        self,
        messages: List[Dict[str, str]],
        system_message: Optional[str],
        **kwargs
    ) -> str:
        """Chat using OpenRouter API"""
        api_key = self._get_api_key()
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY not configured")
        
        config = self.PROVIDER_CONFIGS[LLMProvider.OPENROUTER]
        
        # Prepare messages with system message
        all_messages = []
        if system_message:
            all_messages.append({"role": "system", "content": system_message})
        all_messages.extend(messages)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{config['base_url']}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://blackiefi.app",
                    "X-Title": "BlackieFi Finance"
                },
                json={
                    "model": self.model,
                    "messages": all_messages,
                    **kwargs
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    async def _chat_ollama(
        self,
        messages: List[Dict[str, str]],
        system_message: Optional[str],
        **kwargs
    ) -> str:
        """Chat using local Ollama instance"""
        config = self.PROVIDER_CONFIGS[LLMProvider.OLLAMA]
        base_url = os.environ.get("OLLAMA_HOST", config["base_url"])
        
        # Prepare messages with system message
        all_messages = []
        if system_message:
            all_messages.append({"role": "system", "content": system_message})
        all_messages.extend(messages)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": all_messages,
                    "stream": False,
                    **kwargs
                },
                timeout=120.0
            )
            response.raise_for_status()
            data = response.json()
            return data["message"]["content"]
    
    @classmethod
    def get_available_providers(cls) -> List[Dict[str, Any]]:
        """Get list of available LLM providers with their configurations"""
        providers = []
        for provider in LLMProvider:
            config = cls.PROVIDER_CONFIGS[provider]
            providers.append({
                "id": provider.value,
                "name": provider.value.replace("_", " ").title(),
                "requires_api_key": config.get("env_key") is not None,
                "env_key_name": config.get("env_key"),
                "default_model": config.get("default_model"),
                "is_local": provider == LLMProvider.OLLAMA,
            })
        return providers
    
    @classmethod
    def get_models_for_provider(cls, provider: str) -> List[Dict[str, str]]:
        """Get available models for a specific provider"""
        try:
            provider_enum = LLMProvider(provider)
            return cls.AVAILABLE_MODELS.get(provider_enum, [])
        except ValueError:
            return []
    
    @classmethod
    async def test_provider(cls, provider: str, api_key: Optional[str] = None) -> Dict[str, Any]:
        """Test if a provider is configured and working"""
        try:
            provider_enum = LLMProvider(provider)
            service = cls(provider=provider_enum)
            
            # For testing, use a simple prompt
            response = await service.chat(
                messages=[{"role": "user", "content": "Say 'OK' and nothing else."}],
                system_message="You are a test assistant. Respond only with 'OK'."
            )
            
            return {
                "success": True,
                "provider": provider,
                "response": response[:100],
                "message": f"{provider} is working correctly"
            }
        except Exception as e:
            return {
                "success": False,
                "provider": provider,
                "error": str(e),
                "message": f"Failed to connect to {provider}"
            }


# Singleton instance for easy access
_llm_service: Optional[LLMService] = None

def get_llm_service(provider: str = "emergent", model: Optional[str] = None) -> LLMService:
    """Get or create LLM service instance"""
    global _llm_service
    provider_enum = LLMProvider(provider) if isinstance(provider, str) else provider
    
    if _llm_service is None or _llm_service.provider != provider_enum:
        _llm_service = LLMService(provider=provider_enum, model=model)
    elif model and _llm_service.model != model:
        _llm_service.model = model
    
    return _llm_service
