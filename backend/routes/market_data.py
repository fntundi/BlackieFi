"""
Market Data Routes - API endpoints for stock and crypto market data
Part of BlackieFi 3.0 Market Data Integration
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel

from database import get_db
from routes.auth import get_current_user
from services.market_data_service import (
    get_market_data_service, 
    MarketDataProvider,
    MarketDataService
)

router = APIRouter(prefix="/api/market", tags=["Market Data"])


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class ProviderConfigUpdate(BaseModel):
    """Update market data provider configuration"""
    enabled: Optional[bool] = None
    api_key: Optional[str] = None


class ProviderResponse(BaseModel):
    """Market data provider info"""
    id: str
    name: str
    description: str
    enabled: bool
    has_api_key: bool
    requires_api_key: bool
    signup_url: str
    rate_limit: str
    asset_type: str


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def is_admin(current_user: dict) -> bool:
    """Check if user is admin"""
    return current_user.get("role") == "admin"


# =============================================================================
# PROVIDER MANAGEMENT (Admin)
# =============================================================================

@router.get("/providers")
async def get_providers(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get list of all market data providers and their status"""
    providers = MarketDataService.get_available_providers()
    
    # Get enabled status from database
    result = []
    for provider_info in providers:
        config = await db.market_data_providers.find_one({"provider": provider_info["id"]})
        result.append({
            **provider_info,
            "enabled": config.get("enabled", False) if config else False,
            "has_api_key": bool(config.get("api_key")) if config else False,
        })
    
    return {"providers": result}


@router.put("/providers/{provider}")
async def update_provider_config(
    provider: str,
    config: ProviderConfigUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Update market data provider configuration (Admin only)"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate provider
    valid_providers = [p.value for p in MarketDataProvider]
    if provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {valid_providers}")
    
    update_data = {
        "provider": provider,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    if config.enabled is not None:
        update_data["enabled"] = config.enabled
    if config.api_key is not None:
        update_data["api_key"] = config.api_key
    
    await db.market_data_providers.update_one(
        {"provider": provider},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True, "provider": provider, "updated": update_data}


@router.post("/providers/{provider}/test")
async def test_provider(
    provider: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Test if a market data provider is working"""
    if not is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        provider_enum = MarketDataProvider(provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {provider}")
    
    service = get_market_data_service(db)
    result = await service.test_provider(provider_enum)
    
    return result


# =============================================================================
# STOCK MARKET DATA (Alpha Vantage)
# =============================================================================

@router.get("/stocks/quote/{symbol}")
async def get_stock_quote(
    symbol: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get real-time stock quote"""
    service = get_market_data_service(db)
    result = await service.get_stock_quote(symbol)
    
    if "error" in result:
        if result.get("enabled") == False:
            raise HTTPException(status_code=503, detail="Stock market data is not enabled. Please configure Alpha Vantage in settings.")
        # Pass through API key or other errors
        return result
    
    return result


@router.get("/stocks/historical/{symbol}")
async def get_stock_historical(
    symbol: str,
    outputsize: str = Query("compact", regex="^(compact|full)$"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get historical stock data"""
    service = get_market_data_service(db)
    result = await service.get_stock_historical(symbol, outputsize)
    
    if "error" in result:
        if result.get("enabled") == False:
            raise HTTPException(status_code=503, detail="Stock market data is not enabled")
        # Pass through API key or other errors
        return result
    
    return result


@router.get("/stocks/search")
async def search_stocks(
    q: str = Query(..., min_length=1, max_length=50),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Search for stocks by name or symbol"""
    service = get_market_data_service(db)
    result = await service.search_stocks(q)
    
    if "error" in result:
        if result.get("enabled") == False:
            raise HTTPException(status_code=503, detail="Stock market data is not enabled")
        # Pass through API key or other errors
        return result
    
    return result


# =============================================================================
# CRYPTO MARKET DATA (CoinGecko)
# =============================================================================

@router.get("/crypto/price/{coin_id}")
async def get_crypto_price(
    coin_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get real-time cryptocurrency price"""
    service = get_market_data_service(db)
    result = await service.get_crypto_price(coin_id)
    
    if "error" in result:
        if result.get("enabled") == False:
            raise HTTPException(status_code=503, detail="Crypto market data is not enabled. Please configure CoinGecko in settings.")
        if result.get("requires_api_key"):
            raise HTTPException(status_code=503, detail=result["error"])
    
    return result


@router.get("/crypto/historical/{coin_id}")
async def get_crypto_historical(
    coin_id: str,
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get historical cryptocurrency data"""
    service = get_market_data_service(db)
    result = await service.get_crypto_historical(coin_id, days)
    
    if "error" in result:
        if result.get("enabled") == False:
            raise HTTPException(status_code=503, detail="Crypto market data is not enabled")
        if result.get("requires_api_key"):
            raise HTTPException(status_code=503, detail=result["error"])
    
    return result


@router.get("/crypto/top")
async def get_top_cryptos(
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get top cryptocurrencies by market cap"""
    service = get_market_data_service(db)
    result = await service.get_top_cryptos(limit)
    
    if "error" in result:
        if result.get("enabled") == False:
            raise HTTPException(status_code=503, detail="Crypto market data is not enabled")
        if result.get("requires_api_key"):
            raise HTTPException(status_code=503, detail=result["error"])
    
    return result


@router.get("/crypto/search")
async def search_cryptos(
    q: str = Query(..., min_length=1, max_length=50),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Search for cryptocurrencies"""
    service = get_market_data_service(db)
    result = await service.search_cryptos(q)
    
    if "error" in result:
        if result.get("enabled") == False:
            raise HTTPException(status_code=503, detail="Crypto market data is not enabled")
        if result.get("requires_api_key"):
            raise HTTPException(status_code=503, detail=result["error"])
    
    return result


@router.get("/crypto/trending")
async def get_trending_cryptos(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get trending cryptocurrencies"""
    service = get_market_data_service(db)
    result = await service.get_trending_cryptos()
    
    if "error" in result:
        if result.get("enabled") == False:
            raise HTTPException(status_code=503, detail="Crypto market data is not enabled")
        if result.get("requires_api_key"):
            raise HTTPException(status_code=503, detail=result["error"])
    
    return result
    
    return result
